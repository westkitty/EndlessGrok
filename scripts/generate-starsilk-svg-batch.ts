#!/usr/bin/env node
/**
 * Generates the first Starsilk production SVG batch (resources, victory, macros).
 * Output: public/assets/icons/{family}/{canonical-id}.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(repoRoot, 'public/assets/icons');

type AssetSvg = { family: string; id: string; svg: string };

const ASSETS: AssetSvg[] = [
  {
    family: 'resources',
    id: 'resource-starsilk-thread',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M4 12c3-4 6-4 8 0s5 4 8 0" stroke="#b48cff" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M6 10h12M6 14h12" stroke="#b48cff" stroke-width="0.75" opacity="0.5"/>
  <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ff6b6b" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>
</svg>`,
  },
  {
    family: 'resources',
    id: 'resource-inert-starsilk',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M5 12h14" stroke="#5ec8d8" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
  <rect x="7" y="10" width="10" height="4" rx="1" stroke="#5ec8d8" stroke-width="1.5"/>
  <path d="M9 12h6" stroke="#5ec8d8" stroke-width="1" opacity="0.7"/>
</svg>`,
  },
  {
    family: 'resources',
    id: 'resource-syrin-reagent',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M9 4h6l2 14H7L9 4z" stroke="#6ecfc8" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M8 14h8" stroke="#6ecfc8" stroke-width="1" opacity="0.6"/>
  <circle cx="12" cy="16" r="2" fill="#6ecfc8" opacity="0.35"/>
</svg>`,
  },
  {
    family: 'resources',
    id: 'resource-archive-data',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="5" y="5" width="14" height="14" rx="1" stroke="#7eb8ff" stroke-width="1.5"/>
  <path d="M8 9h8M8 12h6M8 15h4" stroke="#7eb8ff" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M16 5v3h3" stroke="#7eb8ff" stroke-width="1" opacity="0.5"/>
</svg>`,
  },
  {
    family: 'resources',
    id: 'resource-blood-ring-glass',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="7" stroke="#c44" stroke-width="1.5" opacity="0.7"/>
  <path d="M8 12a4 4 0 0 1 8 0" stroke="#8b2020" stroke-width="2" fill="#8b2020" opacity="0.25"/>
  <path d="M12 5v14" stroke="#c44" stroke-width="0.75" opacity="0.4"/>
</svg>`,
  },
  {
    family: 'resources',
    id: 'resource-siege-lattice-fragment',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M6 6l12 12M18 6L6 18" stroke="#a0a8c0" stroke-width="1.2"/>
  <rect x="8" y="8" width="8" height="8" stroke="#c8d0e8" stroke-width="1.5" transform="rotate(45 12 12)"/>
  <circle cx="12" cy="12" r="2" fill="#8890a8" opacity="0.4"/>
</svg>`,
  },
  {
    family: 'victory',
    id: 'victory-starbinding',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M12 3v18" stroke="#ff5555" stroke-width="1.5" stroke-dasharray="3 2"/>
  <path d="M4 12h16" stroke="#b48cff" stroke-width="1.5"/>
  <circle cx="12" cy="12" r="4" stroke="#ff5555" stroke-width="1.5" fill="#ff5555" opacity="0.15"/>
  <path d="M8 8l8 8M16 8l-8 8" stroke="#888" stroke-width="0.75" opacity="0.5"/>
</svg>`,
  },
  {
    family: 'victory',
    id: 'victory-syrin-inerting',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="7" stroke="#5ec8d8" stroke-width="1.5"/>
  <path d="M8 14c1-2 3-3 4-3s3 1 4 3" stroke="#5ec8d8" stroke-width="1.2" fill="#5ec8d8" opacity="0.2"/>
  <path d="M12 5v3M12 16v3" stroke="#5ec8d8" stroke-width="1" opacity="0.5"/>
</svg>`,
  },
  {
    family: 'victory',
    id: 'victory-ledger-dominion',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="5" y="6" width="14" height="12" rx="1" stroke="#c0c8e0" stroke-width="1.5"/>
  <path d="M8 10h8M8 13h6" stroke="#c0c8e0" stroke-width="1"/>
  <circle cx="17" cy="17" r="4" stroke="#f0c040" stroke-width="1.2" fill="#f0c040" opacity="0.2"/>
  <path d="M15.5 17l1.5 1.5 3-3" stroke="#f0c040" stroke-width="1.2" stroke-linecap="round"/>
</svg>`,
  },
  {
    family: 'victory',
    id: 'victory-blood-eclipse',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="7" stroke="#c44" stroke-width="1.5"/>
  <path d="M5 12a7 7 0 0 1 14 0" fill="#8b2020" opacity="0.35"/>
  <path d="M12 5c-2 2-2 5 0 7s2 5 0 7" stroke="#c44" stroke-width="1" opacity="0.6"/>
</svg>`,
  },
  {
    family: 'victory',
    id: 'victory-archive-continuity',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M6 8h12v10H6z" stroke="#7eb8ff" stroke-width="1.5"/>
  <path d="M8 6h8v2H8z" stroke="#7eb8ff" stroke-width="1.2"/>
  <path d="M9 12h6M9 15h4" stroke="#7eb8ff" stroke-width="1" opacity="0.7"/>
  <path d="M14 4l2 2-2 2" stroke="#5ec8d8" stroke-width="1" stroke-linecap="round"/>
</svg>`,
  },
  {
    family: 'macros',
    id: 'macro-local-checksum-audit',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="5" y="5" width="14" height="14" rx="2" stroke="#c0c8e0" stroke-width="1.5"/>
  <path d="M8 12h8M8 9h5M8 15h6" stroke="#c0c8e0" stroke-width="1"/>
  <path d="M16 8l2 2-4 4" stroke="#f0c040" stroke-width="1.2" stroke-linecap="round"/>
</svg>`,
  },
  {
    family: 'macros',
    id: 'macro-first-dirt-protocol',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M6 16c2-4 4-6 6-6s4 2 6 6" stroke="#8b7355" stroke-width="1.5" fill="#8b7355" opacity="0.2"/>
  <path d="M10 14l2-3 2 3" stroke="#6ec86e" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="6" y1="17" x2="18" y2="17" stroke="#8b7355" stroke-width="1"/>
</svg>`,
  },
  {
    family: 'macros',
    id: 'macro-syrin-inerting-mist',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <ellipse cx="12" cy="14" rx="7" ry="4" stroke="#5ec8d8" stroke-width="1.5" fill="#5ec8d8" opacity="0.15"/>
  <path d="M8 10c1-2 3-3 4-3s3 1 4 3" stroke="#6ecfc8" stroke-width="1.2"/>
  <circle cx="12" cy="8" r="2" stroke="#5ec8d8" stroke-width="1"/>
</svg>`,
  },
  {
    family: 'macros',
    id: 'macro-siege-lattice-anchor',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M12 4v16M4 12h16" stroke="#a0a8c0" stroke-width="1"/>
  <path d="M8 8l8 8M16 8l-8 8" stroke="#c8d0e8" stroke-width="1.5"/>
  <circle cx="12" cy="12" r="3" stroke="#c8d0e8" stroke-width="1.5" fill="#8890a8" opacity="0.3"/>
</svg>`,
  },
  {
    family: 'macros',
    id: 'macro-archive-extraction-loop',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M8 12a4 4 0 0 1 8 0" stroke="#7eb8ff" stroke-width="1.5" fill="none"/>
  <path d="M14 10l2-2M14 14l2 2" stroke="#7eb8ff" stroke-width="1.2" stroke-linecap="round"/>
  <rect x="6" y="8" width="5" height="8" rx="1" stroke="#7eb8ff" stroke-width="1.2"/>
</svg>`,
  },
  {
    family: 'macros',
    id: 'macro-drakken-biosphere-render',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="6" stroke="#c44" stroke-width="1.5"/>
  <path d="M8 14c1-3 2-5 4-5s3 2 4 5" stroke="#8b2020" stroke-width="1.5" fill="#8b2020" opacity="0.25"/>
  <path d="M6 18h12" stroke="#c44" stroke-width="1" opacity="0.5"/>
</svg>`,
  },
  {
    family: 'macros',
    id: 'macro-gravity-thread-seal',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="7" stroke="#b48cff" stroke-width="1.5"/>
  <path d="M12 5v14M5 12h14" stroke="#b48cff" stroke-width="0.75" opacity="0.4"/>
  <rect x="9" y="9" width="6" height="6" stroke="#5ec8d8" stroke-width="1.5" transform="rotate(45 12 12)"/>
</svg>`,
  },
  {
    family: 'macros',
    id: 'macro-counter-macro-scrub',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="7" stroke="#ff8866" stroke-width="1.5"/>
  <path d="M9 9l6 6M15 9l-6 6" stroke="#ff8866" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M4 12h3M17 12h3" stroke="#888" stroke-width="1" opacity="0.5"/>
</svg>`,
  },
];

let written = 0;
for (const asset of ASSETS) {
  const dir = resolve(publicRoot, asset.family);
  mkdirSync(dir, { recursive: true });
  const outPath = resolve(dir, `${asset.id}.svg`);
  writeFileSync(outPath, `${asset.svg.trim()}\n`, 'utf8');
  written++;
}

console.log(`Generated ${written} SVG assets under public/assets/icons/`);