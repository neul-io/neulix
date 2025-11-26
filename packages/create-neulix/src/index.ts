#!/usr/bin/env bun
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';

const args = process.argv.slice(2);
const projectName = args[0];

if (!projectName) {
  console.log(`
Usage: bunx create-neulix <project-name>

Example:
  bunx create-neulix my-app
  cd my-app
  bun install
  bun run dev
`);
  process.exit(1);
}

const targetDir = resolve(process.cwd(), projectName);

if (existsSync(targetDir)) {
  console.error(`Error: Directory "${projectName}" already exists.`);
  process.exit(1);
}

console.log(`\nCreating a new Neulix app in ${targetDir}...\n`);

// Create directory
mkdirSync(targetDir, { recursive: true });

// Copy template
const templateDir = join(import.meta.dirname, '..', 'template');
cpSync(templateDir, targetDir, { recursive: true });

// Update package.json with project name
const pkgPath = join(targetDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
pkg.name = basename(projectName);
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// Rename gitignore (npm ignores .gitignore in packages)
const gitignorePath = join(targetDir, 'gitignore');
if (existsSync(gitignorePath)) {
  const dotGitignorePath = join(targetDir, '.gitignore');
  cpSync(gitignorePath, dotGitignorePath);
  const { unlinkSync } = await import('fs');
  unlinkSync(gitignorePath);
}

console.log(`Done! To get started:

  cd ${projectName}
  bun install
  bun run dev

Happy coding!
`);
