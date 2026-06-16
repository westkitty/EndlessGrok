#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getDefinitionsByCategory,
  ALL_EVENT_DEFINITIONS,
} from '../src/data/events/definitions.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const eventsDir = resolve(repoRoot, 'src/data/events');
const fixtureDir = resolve(repoRoot, 'tests/fixtures/events');

const categories = ['starbinding', 'macros', 'resources', 'diplomacy', 'anomalies', 'victory'] as const;

for (const category of categories) {
  const defs = getDefinitionsByCategory(category);
  writeFileSync(
    resolve(eventsDir, `${category}.json`),
    `${JSON.stringify(defs, null, 2)}\n`,
  );
  writeFileSync(
    resolve(fixtureDir, `${category}.json`),
    `${JSON.stringify(defs, null, 2)}\n`,
  );
}

writeFileSync(
  resolve(fixtureDir, 'all-definitions.json'),
  `${JSON.stringify(ALL_EVENT_DEFINITIONS, null, 2)}\n`,
);

console.log(`Materialized ${ALL_EVENT_DEFINITIONS.length} event definitions across ${categories.length} categories`);