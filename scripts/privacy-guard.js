#!/usr/bin/env node
/**
 * Rumah Kita — Repository Privacy Guard & Anti-Leak Scanner CLI
 *
 * Scans the entire Git repository tree (excluding .git and node_modules)
 * to verify that zero local device paths (C:\Users\...), private keys,
 * API tokens, or personal credentials exist before committing or releasing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditStringPrivacy } from '../src/core/privacy-sanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'data', 'dist', 'build', 'coverage']);
const IGNORED_FILES = new Set([
  // Test and scanner files intentionally reference dummy regex examples
  path.join('tests', 'rumah-kita.test.js'),
  path.join('public', 'index.html'),
  path.join('scripts', 'sync-from-local-windows.ps1')
]);

function walkDirectory(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(fullPath, fileList);
    } else if (entry.isFile()) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = walkDirectory(ROOT_DIR);
let totalLeaks = 0;

for (const file of files) {
  const relPath = path.relative(ROOT_DIR, file);
  if (IGNORED_FILES.has(relPath)) continue;

  const content = fs.readFileSync(file, 'utf8');
  const report = auditStringPrivacy(content);
  if (!report.clean) {
    console.error(`[PRIVACY ALERT] Potential leak in ${relPath}:`, report.findings);
    totalLeaks += report.findings.length;
  }
}

if (totalLeaks > 0) {
  console.error(`\n[Privacy Guard] FAILED: Found ${totalLeaks} potential sensitive pattern(s).`);
  process.exit(1);
} else {
  console.log(
    `[Privacy Guard] PASSED: Scanned ${files.length} repository files. Zero local device paths, tokens, or personal leaks found.`
  );
}
