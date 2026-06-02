import { networkInterfaces } from 'os';
import { spawn } from 'bun';

function getLanIp(): string {
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const ip = getLanIp();
const wwwroot = `http://${ip}:8080`;

console.log(`\x1b[36m[start]\x1b[0m IP detectado: \x1b[32m${ip}\x1b[0m`);
console.log(`\x1b[36m[start]\x1b[0m Moodle em:    \x1b[32m${wwwroot}\x1b[0m`);
console.log(`\x1b[36m[start]\x1b[0m Jogo em:      \x1b[32mhttp://${ip}:3000\x1b[0m`);
console.log('');

const extraArgs = process.argv.slice(2);
const proc = spawn(['docker', 'compose', 'up', '-d', ...extraArgs], {
  env: { ...process.env, MOODLE_WWWROOT: wwwroot, LAN_IP: ip },
  stdout: 'inherit',
  stderr: 'inherit',
  cwd: import.meta.dir,
});

await proc.exited;

// Aguarda config.php existir (primeira execução roda install.php, que demora alguns minutos)
const maxWaitMs = 5 * 60 * 1000;
const startWait = Date.now();
let configReady = false;

while (Date.now() - startWait < maxWaitMs) {
  const check = spawn(
    ['docker', 'exec', 'perfil_moodle', 'test', '-f', '/var/www/html/config.php'],
    { stdout: 'ignore', stderr: 'ignore' },
  );
  await check.exited;
  if (check.exitCode === 0) { configReady = true; break; }
  console.log('\x1b[36m[start]\x1b[0m Aguardando Moodle instalar (config.php)...');
  await Bun.sleep(3000);
}

if (!configReady) {
  console.error('\x1b[31m[start]\x1b[0m Timeout: config.php não apareceu em 5 min. Verifique os logs com: docker logs perfil_moodle');
  process.exit(1);
}

// Atualiza wwwroot no config.php caso Moodle já estivesse instalado com IP diferente
const update = spawn([
  'docker', 'exec', 'perfil_moodle',
  'sed', '-i', `s|\\$CFG->wwwroot.*=.*'http://[^']*';|\\$CFG->wwwroot   = '${wwwroot}';|`, '/var/www/html/config.php',
], { stdout: 'inherit', stderr: 'inherit' });

await update.exited;

const purge = spawn([
  'docker', 'exec', 'perfil_moodle',
  'php', '/var/www/html/admin/cli/purge_caches.php',
], { stdout: 'inherit', stderr: 'inherit' });

await purge.exited;

console.log(`\x1b[32m[start]\x1b[0m Pronto! Acesse http://${ip}:8080`);
