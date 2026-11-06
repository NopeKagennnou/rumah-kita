#!/usr/bin/env node
/**
 * Rumah Kita — Zero-Dependency Syntax, Structure & Security Linter
 *
 * Verifies that all JavaScript modules parse cleanly, required Open-Source
 * governance files (LICENSE, README.md, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md)
 * exist and are non-empty, and runs the Privacy Guard check.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const REQUIRED_GOVERNANCE_FILES = [
  'LICENSE',
  'README.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'package.json',
  '.gitignore',
  '.env.example'
];

console.log('[Lint & Audit] Checking Open-Source Governance files...');
for (const reqFile of REQUIRED_GOVERNANCE_FILES) {
  const full = path.join(ROOT_DIR, reqFile);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    console.error(`[Lint & Audit] ERROR: Missing or empty required file: ${reqFile}`);
    process.exit(1);
  }
}

function collectJsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'data'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

const jsFiles = collectJsFiles(ROOT_DIR);
console.log(`[Lint & Audit] Verifying syntax of ${jsFiles.length} JavaScript files...`);
for (const jsFile of jsFiles) {
  execFileSync(process.execPath, ['--check', jsFile], { stdio: 'inherit' });
}

console.log('[Lint & Audit] Running Privacy Guard scan...');
execFileSync(process.execPath, [path.join(ROOT_DIR, 'scripts', 'privacy-guard.js')], {
  stdio: 'inherit'
});

console.log('[Lint & Audit] ALL CHECKS PASSED SUCCESSFULLY.');
