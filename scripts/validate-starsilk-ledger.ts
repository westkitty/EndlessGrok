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
import {
  getRuntimeValidationErrors,
  validateRuntimeManifest,
} from '../src/data/assets/runtimeValidation.ts';
import { loadAssetManifest } from '../src/data/assets/runtimeManifest.ts';
import { validateStarsilkResources } from '../src/data/resources/registry.ts';
import { validateStarsilkFactions } from '../src/data/factions/registry.ts';
import { validateVictoryPaths } from '../src/data/victory/registry.ts';
import { validateStarsilkEvents } from '../src/data/events/registry.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(repoRoot, 'src/data/assets/assets.manifest.json');
const registryDocPath = resolve(repoRoot, 'docs/asset-registry.md');

function repoFileExists(relativePath: string): boolean {
  return existsSync(resolve(repoRoot, relativePath));
}

type CheckResult = { name: string; errors: string[] };

const results: CheckResult[] = [];

function record(name: string, errors: string[]): void {
  results.push({ name, errors });
}

const ledgerRecords = loadLedgerManifest(manifestPath);
const registryRows = parseRegistryDocRows(readFileSync(registryDocPath, 'utf8'));

record('ledger manifest', getLedgerValidationErrors(
  validateLedgerManifest(ledgerRecords, { fileExists: repoFileExists }),
).map(e => `${e.assetId}: ${e.message}`));

record('registry alignment', getLedgerValidationErrors(
  validateRegistryManifestAlignment(ledgerRecords, registryRows),
).map(e => `${e.assetId}: ${e.message}`));

const runtimeRecords = loadAssetManifest().records;
record('runtime manifest', getRuntimeValidationErrors(
  validateRuntimeManifest(runtimeRecords, { fileExists: repoFileExists }),
).map(e => `${e.assetId}: ${e.message}`));

record('resource integrity', validateStarsilkResources().map(e => `${e.key}: ${e.message}`));
record('faction integrity', validateStarsilkFactions().map(e => `${e.factionId}: ${e.message}`));
record('victory integrity', validateVictoryPaths().map(e => `${e.pathId}: ${e.message}`));
record('event integrity', validateStarsilkEvents().map(e => `${e.eventId}: ${e.message}`));

const failed = results.filter(r => r.errors.length > 0);

if (failed.length > 0) {
  console.error('Starsilk ledger validation FAILED');
  for (const result of failed) {
    console.error(`\n[${result.name}]`);
    for (const err of result.errors) {
      console.error(`  ${err}`);
    }
  }
  console.error(`\nTotal errors: ${failed.reduce((n, r) => n + r.errors.length, 0)}`);
  process.exit(1);
}

console.log('Starsilk ledger validation PASSED');
for (const result of results) {
  console.log(`  ✓ ${result.name}`);
}
console.log(`  manifest records: ${ledgerRecords.length}`);
console.log(`  runtime records: ${runtimeRecords.length}`);
process.exit(0);