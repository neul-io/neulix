#!/usr/bin/env bun
import { buildProduction } from './build';
import { dev } from './dev';

const args = process.argv.slice(2);
const command = args[0];

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result[key] = value ?? 'true';
    }
  }
  return result;
}

const options = parseArgs(args);

switch (command) {
  case 'dev': {
    const serverFile = options.server ?? 'src/server.ts';
    const pagesRegistry = options.pages ?? 'src/pages/registry.ts';
    await dev({ serverFile, pagesRegistry });
    break;
  }

  case 'build': {
    const pagesRegistry = options.pages ?? 'src/pages/registry.ts';
    await buildProduction({ pagesRegistry });
    break;
  }

  case 'start': {
    const serverFile = options.server ?? 'src/server.ts';
    const { spawn } = await import('bun');
    spawn({
      cmd: ['bun', 'run', serverFile],
      stdout: 'inherit',
      stderr: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });
    break;
  }

  default:
    console.log(`
neulix - Bun + React SSR Framework

Commands:
  dev     Start development server with hot reload
  build   Build for production
  start   Start production server

Options:
  --server=<path>   Server entry file (default: src/server.ts)
  --pages=<path>    Pages registry file (default: src/pages/registry.ts)

Examples:
  neulix dev
  neulix dev --server=src/server.ts
  neulix build
  neulix start
`);
    if (command) {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
}
