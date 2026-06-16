#!/usr/bin/env node
/** Promote first production batch from prompted → generated-unverified in ledger manifest. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(repoRoot, 'src/data/assets/assets.manifest.json');
const registryDocPath = resolve(repoRoot, 'docs/asset-registry.md');

const BATCH_IDS = new Set([
  'resource-starsilk-thread',
  'resource-inert-starsilk',
  'resource-syrin-reagent',
  'resource-archive-data',
  'resource-blood-ring-glass',
  'resource-siege-lattice-fragment',
  'victory-starbinding',
  'victory-syrin-inerting',
  'victory-ledger-dominion',
  'victory-blood-eclipse',
  'victory-archive-continuity',
  'macro-local-checksum-audit',
  'macro-first-dirt-protocol',
  'macro-syrin-inerting-mist',
  'macro-siege-lattice-anchor',
  'macro-archive-extraction-loop',
  'macro-drakken-biosphere-render',
  'macro-gravity-thread-seal',
  'macro-counter-macro-scrub',
]);

type LedgerRow = { id: string; status: string };

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as LedgerRow[];
let promoted = 0;
for (const row of manifest) {
  if (BATCH_IDS.has(row.id) && row.status === 'prompted') {
    row.status = 'generated-unverified';
    promoted++;
  }
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

let doc = readFileSync(registryDocPath, 'utf8');
for (const id of BATCH_IDS) {
  const promptedPattern = new RegExp(
    `(\\| ${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\|[^|]+\\|[^|]+\\|[^|]+\\| )prompted( \\|)`,
    'g',
  );
  const next = doc.replace(promptedPattern, '$1generated-unverified$2');
  if (next !== doc) {
    doc = next;
    promoted++;
  }
}
writeFileSync(registryDocPath, doc, 'utf8');

console.log(`Promoted ${BATCH_IDS.size} ledger rows; manifest updates: ${promoted}`);