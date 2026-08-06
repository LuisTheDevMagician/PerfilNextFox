import { spawn } from 'bun';
import { cpSync, existsSync, rmSync } from 'node:fs';

async function ensureInstalled(label: 'backend' | 'frontend') {
  const dir = `${import.meta.dir}/${label}`;
  if (!existsSync(`${dir}/node_modules`)) {
    console.log(`\x1b[33m[install] node_modules não encontrado em ${label}/ — rodando bun install...\x1b[0m`);
    const proc = spawn(['bun', 'install'], { cwd: dir, stdout: 'inherit', stderr: 'inherit' });
    const code = await proc.exited;
    if (code !== 0) {
      console.error(`\x1b[31m[install] Falha ao instalar dependências do ${label} (código ${code})\x1b[0m`);
      process.exit(1);
    }
    console.log(`\x1b[32m[install] ${label} — dependências instaladas!\x1b[0m`);
  }
}

// Marcador de build de produção: dist/index.js no backend, .next/BUILD_ID no frontend
// (não .next/dev, que é só o cache do turbopack em modo dev).
function isBuilt(label: 'backend' | 'frontend'): boolean {
  const dir = `${import.meta.dir}/${label}`;
  return label === 'backend'
    ? existsSync(`${dir}/dist/index.js`)
    : existsSync(`${dir}/.next/standalone/server.js`);
}

async function ensureBuilt(label: 'backend' | 'frontend') {
  if (isBuilt(label)) return;
  const dir = `${import.meta.dir}/${label}`;
  console.log(`\x1b[33m[build] build de produção não encontrado em ${label}/ — rodando bun run build...\x1b[0m`);
  const proc = spawn(['bun', 'run', 'build'], { cwd: dir, stdout: 'inherit', stderr: 'inherit' });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`\x1b[31m[build] Falha ao buildar o ${label} (código ${code})\x1b[0m`);
    process.exit(1);
  }
  console.log(`\x1b[32m[build] ${label} — build concluído!\x1b[0m`);
}

// O "start" do frontend (next.config: output standalone) precisa de public/ e
// .next/static copiados ao lado do server.js — replicado aqui em vez de rodar
// via "bun run start", para que o processo do servidor seja filho direto deste
// script (senão o Ctrl+C mata só o wrapper "bun run" e o server.js real sobrevive).
function prepareFrontendRuntime() {
  const dir = `${import.meta.dir}/frontend`;
  rmSync(`${dir}/.next/standalone/public`, { recursive: true, force: true });
  rmSync(`${dir}/.next/standalone/.next/static`, { recursive: true, force: true });
  cpSync(`${dir}/public`, `${dir}/.next/standalone/public`, { recursive: true });
  cpSync(`${dir}/.next/static`, `${dir}/.next/standalone/.next/static`, { recursive: true });
}

await ensureInstalled('backend');
await ensureInstalled('frontend');
await ensureBuilt('backend');
await ensureBuilt('frontend');
prepareFrontendRuntime();

const colors = { backend: '\x1b[35m', frontend: '\x1b[36m', reset: '\x1b[0m' };

function prefix(label: 'backend' | 'frontend', text: string): string {
  const col = colors[label];
  return text
    .split('\n')
    .filter(l => l.length > 0)
    .map(l => `${col}[${label}]${colors.reset} ${l}`)
    .join('\n');
}

function pipe(label: 'backend' | 'frontend', stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = dec.decode(value);
      process.stdout.write(prefix(label, text) + '\n');
    }
  })();
}

// Spawna os processos reais diretamente (não "bun run start"), para que
// backend.kill()/frontend.kill() encerrem o servidor de verdade e não um
// wrapper com um processo-servidor órfão por trás.
const backend = spawn(['bun', 'dist/index.js'], {
  cwd: `${import.meta.dir}/backend`,
  stdout: 'pipe',
  stderr: 'pipe',
});

const frontend = spawn(['bun', '.next/standalone/server.js'], {
  cwd: `${import.meta.dir}/frontend`,
  stdout: 'pipe',
  stderr: 'pipe',
  env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' },
});

pipe('backend', backend.stdout);
pipe('backend', backend.stderr);
pipe('frontend', frontend.stdout);
pipe('frontend', frontend.stderr);

console.log('\x1b[32m[start] Backend (3001) + Frontend (3000) iniciados em modo produção\x1b[0m\n');

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
}

await Promise.all([backend.exited, frontend.exited]);
