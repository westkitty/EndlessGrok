#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESOURCE_ASSETS } from '../src/data/assets/records/resources.ts';
import { VICTORY_ASSETS } from '../src/data/assets/records/victory.ts';
import { MACRO_ASSETS } from '../src/data/assets/records/macros.ts';
import { MAP_ASSETS } from '../src/data/assets/records/map.ts';
import { STARSILK_FACTION_ASSETS } from '../src/data/assets/records/starsilkFactions.ts';
import { FLEET_ICON_ASSETS } from '../src/data/assets/records/fleetIcons.ts';
import { UI_ASSETS } from '../src/data/assets/records/ui.ts';
import type { AssetRecord } from '../src/data/assets/types.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(repoRoot, 'src/data/assets/__fixtures__/manifests');

function toManifestEntry(record: AssetRecord) {
  const path = record.plannedFiles?.svg ?? '';
  const filename = path.split('/').pop() ?? `${record.id}.svg`;
  return {
    assetId: record.id,
    mechanicalKey: record.mechanicalKey,
    family: record.family,
    displayName: record.displayName,
    filename,
    relativePath: path,
    status: record.status,
    testId: record.testId,
    fallbackIconName: record.fallbackIconName,
    visualVariant: record.visualVariant,
    tooltip: record.tooltip,
    states: record.states,
    sourceLabel: record.sourceBasis,
    qaChecks: ['mechanical summary present', 'imagery guardrails pass', 'dark background legible'],
  };
}

function buildBatch(batchId: string, batchName: string, records: AssetRecord[]) {
  return {
    batchId,
    batchName,
    sourceAgent: 'Starsilk Asset Production Agent',
    createdAt: new Date().toISOString(),
    canonSafetyVersion: '1.0',
    assets: records.filter(r => r.status === 'generated').map(toManifestEntry),
  };
}

const resources = RESOURCE_ASSETS.filter(r => r.id.startsWith('resource-'));
const victories = VICTORY_ASSETS.filter(r => r.id.startsWith('victory-') && r.status === 'generated');
const macros = MACRO_ASSETS.filter(r => r.status === 'generated');

const ledgerMapIds = new Set([
  'map-star-normal', 'map-collapsed-star', 'map-starbinding-target',
  'map-deposit-starsilk-leak', 'map-deposit-syrin-trace', 'map-deposit-blood-ring-glass',
  'map-deposit-siege-lattice-fragment', 'map-deposit-archive-data',
  'map-hazard-singularity', 'map-hazard-unstable-star', 'map-hazard-macro-sealed-system',
  'map-lane-normal', 'map-lane-unknown', 'map-lane-blocked', 'map-lane-hazardous',
  'map-lane-sealed', 'map-lane-hostile', 'map-fog-intel-mask',
]);
const mapLedger = MAP_ASSETS.filter(r => ledgerMapIds.has(r.id));

const batches = [
  ['batch-resources-generated', 'Starsilk Resource Icons (Generated)', resources],
  ['batch-victory-generated', 'Starsilk Victory Icons (Generated)', victories],
  ['batch-macros-generated', 'Starsilk Macro Icons (Generated)', macros],
  ['batch-map-generated', 'Starsilk Map Icons (Generated)', mapLedger],
  ['batch-factions-generated', 'Starsilk Faction Emblems (Generated)', STARSILK_FACTION_ASSETS],
  ['batch-fleets-generated', 'Starsilk Fleet Icons (Generated)', FLEET_ICON_ASSETS],
  ['batch-ui-generated', 'Starsilk UI Chrome (Generated)', UI_ASSETS],
] as const;

for (const [id, name, records] of batches) {
  const path = resolve(outDir, `${id}.json`);
  writeFileSync(path, `${JSON.stringify(buildBatch(id, name, records), null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path} (${records.length} assets)`);
}