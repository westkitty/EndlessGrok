#!/usr/bin/env node
/** Batch 3: fleet icons (9) + UI chrome (18). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public/assets/icons');

type AssetSvg = { family: string; id: string; svg: string };

const ASSETS: AssetSvg[] = [
  // Fleet role icons
  { family: 'fleets', id: 'fleet-scout-icon', svg: scoutIcon() },
  { family: 'fleets', id: 'fleet-colony-icon', svg: colonyIcon() },
  { family: 'fleets', id: 'fleet-military-icon', svg: militaryIcon() },
  { family: 'fleets', id: 'fleet-defense-icon', svg: defenseIcon() },
  { family: 'fleets', id: 'fleet-movement-trail', svg: movementTrail() },
  { family: 'fleets', id: 'fleet-selected-marker', svg: selectedMarker() },
  { family: 'fleets', id: 'fleet-combat-risk-low', svg: combatRisk('#5ec878') },
  { family: 'fleets', id: 'fleet-combat-risk-medium', svg: combatRisk('#e8c860') },
  { family: 'fleets', id: 'fleet-combat-risk-high', svg: combatRisk('#ff5555') },
  // UI panel headers
  { family: 'ui', id: 'ui-panel-header-research', svg: panelHeader('#7eb8ff', 'R') },
  { family: 'ui', id: 'ui-panel-header-fleet-manager', svg: panelHeader('#8a9ab0', 'F') },
  { family: 'ui', id: 'ui-panel-header-macro-panel', svg: panelHeader('#b48cff', 'M') },
  { family: 'ui', id: 'ui-panel-header-victory', svg: panelHeader('#e8c860', 'V') },
  { family: 'ui', id: 'ui-panel-header-diplomacy', svg: panelHeader('#5ec8d8', 'D') },
  { family: 'ui', id: 'ui-tooltip-system-frame', svg: tooltipFrame() },
  // Warning modals
  { family: 'ui', id: 'ui-warning-heliocide-modal', svg: warningModal('#ff5555') },
  { family: 'ui', id: 'ui-warning-starbinding-modal', svg: warningModal('#ff8866') },
  { family: 'ui', id: 'ui-warning-war-move-modal', svg: warningModal('#c44') },
  { family: 'ui', id: 'ui-warning-production-cancel-modal', svg: warningModal('#e8c860') },
  // Progress bars
  { family: 'ui', id: 'ui-progress-bar-victory', svg: progressBar('#e8c860', 0.7) },
  { family: 'ui', id: 'ui-progress-bar-macro-duration', svg: progressBar('#b48cff', 0.45) },
  // Status badges
  { family: 'ui', id: 'ui-status-badge-active-macro', svg: statusBadge('#b48cff', 'pulse') },
  { family: 'ui', id: 'ui-status-badge-hazard-sealed', svg: statusBadge('#5ec8d8', 'seal') },
  { family: 'ui', id: 'ui-status-badge-inerted', svg: statusBadge('#5ec878', 'inert') },
  { family: 'ui', id: 'ui-status-badge-hostile', svg: statusBadge('#ff5555', 'hostile') },
  // Empty states
  { family: 'ui', id: 'ui-empty-state-fleet-manager', svg: emptyState('fleet') },
  { family: 'ui', id: 'ui-empty-state-macro-intel', svg: emptyState('macro') },
  { family: 'ui', id: 'ui-empty-state-victory-paths', svg: emptyState('victory') },
];

function scoutIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M12 5l6 14H6z" stroke="#8a9ab0" stroke-width="1.5" fill="#8a9ab0" opacity="0.15"/>
  <circle cx="12" cy="10" r="2" stroke="#7eb8ff" stroke-width="1.2"/>
  <path d="M12 12v4" stroke="#7eb8ff" stroke-width="1" stroke-dasharray="2 1"/>
</svg>`;
}

function colonyIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="6" y="10" width="12" height="8" rx="1" stroke="#8a9ab0" stroke-width="1.5"/>
  <circle cx="9" cy="14" r="1" fill="#5ec878"/>
  <circle cx="12" cy="14" r="1" fill="#5ec878"/>
  <circle cx="15" cy="14" r="1" fill="#5ec878"/>
  <path d="M8 10V8h8v2" stroke="#8a9ab0" stroke-width="1.2"/>
</svg>`;
}

function militaryIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M8 18l4-12 4 12" stroke="#c44" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="9" y1="14" x2="15" y2="14" stroke="#c44" stroke-width="1.5"/>
</svg>`;
}

function defenseIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M12 4l7 3v6c0 4-3 6-7 7-4-1-7-3-7-7V7z" stroke="#5ec8d8" stroke-width="1.5" fill="#5ec8d8" opacity="0.12"/>
  <path d="M10 11h4v3h-4z" stroke="#5ec8d8" stroke-width="1"/>
</svg>`;
}

function movementTrail(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M5 12c3-4 6-4 9 0s6 4 9 0" stroke="#7eb8ff" stroke-width="1.5" stroke-dasharray="3 2" fill="none"/>
  <circle cx="5" cy="12" r="1.5" fill="#7eb8ff"/>
  <circle cx="19" cy="12" r="1.5" fill="#7eb8ff" opacity="0.5"/>
</svg>`;
}

function selectedMarker(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="7" stroke="#e8c860" stroke-width="1.5" stroke-dasharray="4 2"/>
  <circle cx="12" cy="12" r="3" stroke="#e8c860" stroke-width="1.2"/>
</svg>`;
}

function combatRisk(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M12 5l8 14H4z" stroke="${color}" stroke-width="1.5" fill="${color}" opacity="0.15"/>
  <line x1="12" y1="9" x2="12" y2="14" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="12" cy="16.5" r="1" fill="${color}"/>
</svg>`;
}

function panelHeader(accent: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="3" y="7" width="18" height="10" rx="1" stroke="#6a7a90" stroke-width="1.2"/>
  <rect x="3" y="7" width="4" height="10" rx="1" fill="${accent}" opacity="0.35"/>
  <text x="14" y="14.5" font-size="6" fill="${accent}" font-family="monospace">${label}</text>
</svg>`;
}

function tooltipFrame(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="4" y="5" width="16" height="12" rx="2" stroke="#8a9ab0" stroke-width="1.2"/>
  <path d="M10 17l2 3 2-3" stroke="#8a9ab0" stroke-width="1.2" fill="none"/>
  <line x1="7" y1="9" x2="17" y2="9" stroke="#6a7a90" stroke-width="0.8" opacity="0.5"/>
  <line x1="7" y1="12" x2="14" y2="12" stroke="#6a7a90" stroke-width="0.8" opacity="0.5"/>
</svg>`;
}

function warningModal(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="4" y="6" width="16" height="13" rx="2" stroke="#6a7a90" stroke-width="1.2"/>
  <path d="M12 9l4 7H8z" stroke="${color}" stroke-width="1.3" fill="${color}" opacity="0.2"/>
  <line x1="12" y1="11" x2="12" y2="13.5" stroke="${color}" stroke-width="1.2"/>
  <circle cx="12" cy="15" r="0.8" fill="${color}"/>
</svg>`;
}

function progressBar(color: string, fill: number): string {
  const width = Math.round(14 * fill);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="5" y="10" width="14" height="4" rx="1" stroke="#6a7a90" stroke-width="1"/>
  <rect x="5" y="10" width="${width}" height="4" rx="1" fill="${color}" opacity="0.5"/>
</svg>`;
}

function statusBadge(color: string, variant: string): string {
  const inner =
    variant === 'pulse'
      ? '<circle cx="12" cy="12" r="2" fill="' + color + '"/>'
      : variant === 'seal'
        ? '<rect x="9" y="9" width="6" height="6" rx="1" stroke="' + color + '" stroke-width="1.2" transform="rotate(45 12 12)"/>'
        : variant === 'inert'
          ? '<path d="M9 12h6" stroke="' + color + '" stroke-width="1.5"/>'
          : '<path d="M9 9l6 6M15 9l-6 6" stroke="' + color + '" stroke-width="1.5"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="5" y="8" width="14" height="8" rx="4" stroke="${color}" stroke-width="1.2" fill="${color}" opacity="0.1"/>
  ${inner}
</svg>`;
}

function emptyState(kind: string): string {
  const glyph =
    kind === 'fleet'
      ? '<path d="M8 16l4-8 4 8z" stroke="#6a7a90" stroke-width="1" opacity="0.4"/>'
      : kind === 'macro'
        ? '<rect x="9" y="9" width="6" height="6" stroke="#6a7a90" stroke-width="1" opacity="0.4"/>'
        : '<circle cx="12" cy="12" r="3" stroke="#6a7a90" stroke-width="1" opacity="0.4"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="6" y="6" width="12" height="12" rx="2" stroke="#6a7a90" stroke-width="1.2" stroke-dasharray="3 2"/>
  ${glyph}
</svg>`;
}

let written = 0;
for (const asset of ASSETS) {
  const dir = resolve(publicRoot, asset.family);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${asset.id}.svg`), `${asset.svg.trim()}\n`, 'utf8');
  written++;
}
console.log(`Generated ${written} batch-3 SVG assets`);