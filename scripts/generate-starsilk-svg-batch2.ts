#!/usr/bin/env node
/** Batch 2: map state icons (18) + Starsilk faction emblems (6). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public/assets/icons');

type AssetSvg = { family: string; id: string; svg: string };

const ASSETS: AssetSvg[] = [
  // Map — stars & hazards
  { family: 'map', id: 'map-star-normal', svg: star('#e8c860', false) },
  { family: 'map', id: 'map-collapsed-star', svg: blackHole() },
  { family: 'map', id: 'map-starbinding-target', svg: star('#ff5555', true) },
  { family: 'map', id: 'map-hazard-singularity', svg: singularityHazard() },
  { family: 'map', id: 'map-hazard-unstable-star', svg: star('#ffaa44', true) },
  { family: 'map', id: 'map-hazard-macro-sealed-system', svg: sealedSystem() },
  { family: 'map', id: 'map-fog-intel-mask', svg: fogMask() },
  // Map — deposits
  { family: 'map', id: 'map-deposit-starsilk-leak', svg: deposit('#b48cff') },
  { family: 'map', id: 'map-deposit-syrin-trace', svg: deposit('#5ec8d8') },
  { family: 'map', id: 'map-deposit-blood-ring-glass', svg: deposit('#c44') },
  { family: 'map', id: 'map-deposit-siege-lattice-fragment', svg: deposit('#a0a8c0') },
  { family: 'map', id: 'map-deposit-archive-data', svg: deposit('#7eb8ff') },
  // Map — lanes
  { family: 'map', id: 'map-lane-normal', svg: lane('#8a9ab0', 'solid') },
  { family: 'map', id: 'map-lane-unknown', svg: lane('#6a7a90', 'dashed') },
  { family: 'map', id: 'map-lane-blocked', svg: laneBlocked() },
  { family: 'map', id: 'map-lane-hazardous', svg: lane('#ff8866', 'dash') },
  { family: 'map', id: 'map-lane-sealed', svg: lane('#5ec8d8', 'double') },
  { family: 'map', id: 'map-lane-hostile', svg: laneHostile() },
  // Faction emblems
  { family: 'factions', id: 'faction-ledger-administration-emblem', svg: emblemLedger() },
  { family: 'factions', id: 'faction-drakken-genesis-host-emblem', svg: emblemDrakken() },
  { family: 'factions', id: 'faction-solidarity-cells-partition-front-emblem', svg: emblemSolidarity() },
  { family: 'factions', id: 'faction-syrin-survivor-enclave-emblem', svg: emblemSyrin() },
  { family: 'factions', id: 'faction-archive-custodians-exhumed-cipher-emblem', svg: emblemArchive() },
  { family: 'factions', id: 'faction-containment-order-shard-god-emblem', svg: emblemContainment() },
];

function star(color: string, fractured: boolean): string {
  const crack = fractured
    ? '<path d="M12 6v12M8 9l8 6M16 9l-8 6" stroke="#888" stroke-width="0.75" opacity="0.6"/>'
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="5" fill="${color}" opacity="0.35"/>
  <circle cx="12" cy="12" r="5" stroke="${color}" stroke-width="1.5"/>
  ${crack}
</svg>`;
}

function blackHole(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="6" fill="#111" stroke="#666" stroke-width="1.5"/>
  <ellipse cx="12" cy="12" rx="8" ry="3" stroke="#b48cff" stroke-width="1" opacity="0.5" transform="rotate(-20 12 12)"/>
</svg>`;
}

function singularityHazard(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="4" fill="#ff5555" opacity="0.2"/>
  <path d="M12 4v16M4 12h16" stroke="#ff8866" stroke-width="1" opacity="0.5"/>
  <circle cx="12" cy="12" r="6" stroke="#ff8866" stroke-width="1.5" stroke-dasharray="3 2"/>
</svg>`;
}

function sealedSystem(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="6" y="6" width="12" height="12" rx="2" stroke="#5ec8d8" stroke-width="1.5" transform="rotate(45 12 12)"/>
  <circle cx="12" cy="12" r="3" stroke="#5ec8d8" stroke-width="1.2"/>
</svg>`;
}

function fogMask(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="4" y="4" width="16" height="16" rx="2" stroke="#6a7a90" stroke-width="1.5" opacity="0.5"/>
  <path d="M6 14c2-2 4-2 6 0s4 2 6 0" stroke="#8a9ab0" stroke-width="1.2" fill="#8a9ab0" opacity="0.15"/>
</svg>`;
}

function deposit(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M8 16l4-8 4 8z" stroke="${color}" stroke-width="1.5" fill="${color}" opacity="0.2"/>
  <circle cx="12" cy="8" r="2" stroke="${color}" stroke-width="1.2"/>
</svg>`;
}

function lane(color: string, style: 'solid' | 'dashed' | 'double' | 'dash'): string {
  const dash = style === 'dashed' ? 'stroke-dasharray="4 3"' : style === 'dash' ? 'stroke-dasharray="2 2"' : '';
  const second = style === 'double' ? `<line x1="8" y1="14" x2="16" y2="14" stroke="${color}" stroke-width="1.5"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <line x1="8" y1="12" x2="16" y2="12" stroke="${color}" stroke-width="2" ${dash}/>
  ${second}
</svg>`;
}

function laneBlocked(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <line x1="7" y1="12" x2="17" y2="12" stroke="#666" stroke-width="2"/>
  <path d="M11 9l2 6M13 9l-2 6" stroke="#ff5555" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;
}

function laneHostile(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <line x1="7" y1="12" x2="17" y2="12" stroke="#c44" stroke-width="2"/>
  <path d="M10 9h4v6h-4z" stroke="#c44" stroke-width="1.2" fill="#c44" opacity="0.2"/>
</svg>`;
}

function emblemLedger(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="5" y="5" width="14" height="14" rx="1" stroke="#c0c8e0" stroke-width="1.5"/>
  <path d="M8 10h8M8 13h6" stroke="#c0c8e0" stroke-width="1"/>
  <circle cx="17" cy="17" r="3" stroke="#f0c040" stroke-width="1"/>
</svg>`;
}

function emblemDrakken(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="7" stroke="#c44" stroke-width="1.5"/>
  <path d="M8 14c1-3 3-5 4-5s3 2 4 5" stroke="#8b2020" stroke-width="1.5" fill="#8b2020" opacity="0.25"/>
</svg>`;
}

function emblemSolidarity(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M6 12h12M12 6v12" stroke="#e8a040" stroke-width="1.5"/>
  <rect x="8" y="8" width="8" height="8" stroke="#e8a040" stroke-width="1.2" transform="rotate(45 12 12)"/>
</svg>`;
}

function emblemSyrin(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="7" stroke="#5ec8d8" stroke-width="1.5"/>
  <path d="M9 14c1-2 3-3 6-3" stroke="#6ecfc8" stroke-width="1.2" fill="#5ec8d8" opacity="0.15"/>
</svg>`;
}

function emblemArchive(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M7 8h10v10H7z" stroke="#7eb8ff" stroke-width="1.5"/>
  <path d="M9 6h6v2H9z" stroke="#7eb8ff" stroke-width="1.2"/>
  <path d="M9 12h6M9 15h4" stroke="#7eb8ff" stroke-width="1" opacity="0.7"/>
</svg>`;
}

function emblemContainment(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <polygon points="12,4 20,20 4,20" stroke="#a0b0d0" stroke-width="1.5" fill="none"/>
  <circle cx="12" cy="14" r="2" stroke="#a0b0d0" stroke-width="1.2"/>
</svg>`;
}

let written = 0;
for (const asset of ASSETS) {
  const dir = resolve(publicRoot, asset.family);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${asset.id}.svg`), `${asset.svg.trim()}\n`, 'utf8');
  written++;
}
console.log(`Generated ${written} batch-2 SVG assets`);