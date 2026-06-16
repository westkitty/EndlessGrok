#!/usr/bin/env node
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPreviewManifest } from '../src/data/assets/cli.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestArg = process.argv[2];

if (!manifestArg) {
  console.error('Usage: npm run assets:preview -- <path/to/manifest.json>');
  process.exit(1);
}

void runPreviewManifest(manifestArg, repoRoot).then(code => process.exit(code));