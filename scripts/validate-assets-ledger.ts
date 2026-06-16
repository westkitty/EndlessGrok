#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseRegistryDocRows,
  validateLedgerManifest,
  validateRegistryManifestAlignment,
  getLedgerValidationErrors,
} from '../src/data/assets/ledger.ts';
import { loadLedgerManifest } from '../src/data/assets/ledgerLoad.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(repoRoot, 'src/data/assets/assets.manifest.json');
const registryDocPath = resolve(repoRoot, 'docs/asset-registry.md');

function repoFileExists(relativePath: string): boolean {
  return existsSync(resolve(repoRoot, relativePath));
}

const records = loadLedgerManifest(manifestPath);
const registryMarkdown = readFileSync(registryDocPath, 'utf8');
const registryRows = parseRegistryDocRows(registryMarkdown);

const manifestIssues = validateLedgerManifest(records, { fileExists: repoFileExists });
const alignmentIssues = validateRegistryManifestAlignment(records, registryRows);
const allIssues = [...manifestIssues, ...alignmentIssues];
const errors = getLedgerValidationErrors(allIssues);
const warnings = allIssues.filter(issue => issue.severity === 'warning');

if (errors.length > 0) {
  console.error(`Ledger validation FAILED (${records.length} manifest records, ${registryRows.length} registry rows)`);
  for (const err of errors) {
    console.error(`  [error] ${err.assetId}${err.field ? `.${err.field}` : ''}: ${err.message}`);
  }
  for (const warn of warnings) {
    console.warn(`  [warn] ${warn.assetId}: ${warn.message}`);
  }
  process.exit(1);
}

console.log(`Ledger validation PASSED (${records.length} records)`);
console.log(`  manifest: src/data/assets/assets.manifest.json`);
console.log(`  registry: docs/asset-registry.md`);
for (const warn of warnings) {
  console.warn(`  [warn] ${warn.assetId}: ${warn.message}`);
}
process.exit(0);