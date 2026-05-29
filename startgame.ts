import { spawn } from 'bun';
import { existsSync } from 'node:fs';

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

await ensureInstalled('backend');
await ensureInstalled('frontend');

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

const backend = spawn(['bun', 'run', 'dev'], {
  cwd: `${import.meta.dir}/backend`,
  stdout: 'pipe',
  stderr: 'pipe',
});

const frontend = spawn(['bun', 'run', 'dev'], {
  cwd: `${import.meta.dir}/frontend`,
  stdout: 'pipe',
  stderr: 'pipe',
});

pipe('backend', backend.stdout);
pipe('backend', backend.stderr);
pipe('frontend', frontend.stdout);
pipe('frontend', frontend.stderr);

console.log('\x1b[32m[dev] Backend (3001) + Frontend (3000) iniciados\x1b[0m\n');

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
}

await Promise.all([backend.exited, frontend.exited]);
