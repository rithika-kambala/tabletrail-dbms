import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = [];
const backend = spawn(process.execPath, ['backend/src/server.js'], {
  cwd: root,
  env: { ...process.env, PORT: '4000' },
  stdio: 'inherit',
});
const frontend = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'start',
    '--hostname',
    '0.0.0.0',
    '--port',
    process.env.PORT || '10000',
  ],
  { cwd: root, env: process.env, stdio: 'inherit' },
);
children.push(backend, frontend);

let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill(signal);
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => stop(signal));
for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!stopping) {
      stop();
      process.exitCode = code || (signal ? 1 : 0);
    }
  });
}
