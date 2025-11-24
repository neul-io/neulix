import { watch } from 'fs';
import { spawn, type Subprocess } from 'bun';
import { join } from 'path';

let serverProcess: Subprocess | null = null;

function startServer() {
  if (serverProcess) {
    serverProcess.kill();
  }

  console.log('\n🔄 Starting server...\n');

  serverProcess = spawn({
    cmd: ['bun', 'run', 'src/server.ts'],
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });
}

function restartServer() {
  console.log('\n🔄 File change detected, restarting server...\n');
  startServer();
}

const srcDir = join(process.cwd(), 'src');

const watcher = watch(srcDir, { recursive: true }, (eventType, filename) => {
  if (
    filename &&
    (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.css'))
  ) {
    restartServer();
  }
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...\n');
  if (serverProcess) {
    serverProcess.kill();
  }
  watcher.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  watcher.close();
  process.exit(0);
});

console.log('👀 Watching for file changes in src/...\n');
startServer();
