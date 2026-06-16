#!/usr/bin/env node
/**
 * Promote ledger manifest + docs/asset-registry.md rows to a target status.
 * Usage: npx tsx scripts/promote-asset-status.ts <from-status> <to-status> id1 id2 ...
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(repoRoot, 'src/data/assets/assets.manifest.json');
const registryDocPath = resolve(repoRoot, 'docs/asset-registry.md');

const [, , fromStatus, toStatus, ...ids] = process.argv;
if (!fromStatus || !toStatus || ids.length === 0) {
  console.error('Usage: promote-asset-status.ts <from> <to> <id>...');
  process.exit(1);
}

const idSet = new Set(ids);
type LedgerRow = { id: string; status: string };

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as LedgerRow[];
let manifestUpdates = 0;
for (const row of manifest) {
  if (idSet.has(row.id) && row.status === fromStatus) {
    row.status = toStatus;
    manifestUpdates++;
  }
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

let doc = readFileSync(registryDocPath, 'utf8');
let docUpdates = 0;
for (const id of idSet) {
  const pattern = new RegExp(
    `(\\| ${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\|[^|]+\\|[^|]+\\|[^|]+\\| )${fromStatus}( \\|)`,
    'g',
  );
  const next = doc.replace(pattern, `$1${toStatus}$2`);
  if (next !== doc) {
    doc = next;
    docUpdates++;
  }
}
writeFileSync(registryDocPath, doc, 'utf8');

console.log(`Promoted ${manifestUpdates} manifest rows (${fromStatus} → ${toStatus})`);
console.log(`Updated ${docUpdates} doc rows`);