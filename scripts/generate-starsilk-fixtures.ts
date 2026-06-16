#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAssetManifest } from '../src/data/assets/runtimeManifest.ts';
import { getAllStarsilkResources } from '../src/data/resources/registry.ts';
import { getAllStarsilkFactions } from '../src/data/factions/registry.ts';
import { getAllVictoryPaths } from '../src/data/victory/registry.ts';
import { getAllStarsilkEvents } from '../src/data/events/registry.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesRoot = resolve(repoRoot, 'tests/fixtures');

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

const manifest = loadAssetManifest();
writeJson(resolve(fixturesRoot, 'assets/manifest-index.json'), {
  version: manifest.version,
  count: manifest.recordCount,
  ids: manifest.records.map(r => r.id),
});

for (const record of manifest.records) {
  writeJson(resolve(fixturesRoot, `assets/${record.id}.json`), record);
}

writeJson(resolve(fixturesRoot, 'resources/all.json'), getAllStarsilkResources());
for (const resource of getAllStarsilkResources()) {
  writeJson(resolve(fixturesRoot, `resources/${resource.key}.json`), resource);
}

writeJson(resolve(fixturesRoot, 'factions/all.json'), getAllStarsilkFactions());

writeJson(resolve(fixturesRoot, 'victory/paths.json'), getAllVictoryPaths());
for (const path of getAllVictoryPaths()) {
  writeJson(resolve(fixturesRoot, `victory/${path.id}.json`), path);
}

writeJson(resolve(fixturesRoot, 'events/all.json'), getAllStarsilkEvents());
for (const event of getAllStarsilkEvents()) {
  writeJson(resolve(fixturesRoot, `events/${event.id}.json`), event);
}

console.log('Generated Starsilk fixtures:');
console.log(`  assets: ${manifest.recordCount}`);
console.log(`  resources: ${getAllStarsilkResources().length}`);
console.log(`  factions: ${getAllStarsilkFactions().length}`);
console.log(`  victory paths: ${getAllVictoryPaths().length}`);
console.log(`  events: ${getAllStarsilkEvents().length}`);