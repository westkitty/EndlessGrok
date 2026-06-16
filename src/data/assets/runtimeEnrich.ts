import type { LedgerAssetRecord } from './ledger';
import { getLedgerFilename, getLedgerPrimaryPath } from './ledger';
import type { AssetTooltip, SourceBasis, StarsilkAssetRecord } from './runtimeTypes';

const RESOURCE_TOOLTIPS: Record<string, AssetTooltip> = {
  'resource-starsilk-thread': {
    title: 'Starsilk Thread',
    mechanical: 'Rare strategic resource for high-risk Starsilk systems.',
    lore: 'Dangerous systemic filament, not fuel.',
    warning: 'Thread misuse escalates diplomatic and hazard pressure.',
    uiNotes: 'Warning-coded ribbon/barcode icon.',
  },
  'resource-inert-starsilk': {
    title: 'Inert Starsilk',
    mechanical: 'Stabilized Starsilk input for safer operations.',
    lore: 'Muted sealed strand; stabilized, not purified.',
    uiNotes: 'Use sealed/muted visual language.',
  },
  'resource-syrin-reagent': {
    title: 'Syrin Reagent',
    mechanical: 'Inerting and bypass resource.',
    lore: 'Containment vapor or droplet, not blood.',
    warning: 'Inerting buys time; it does not erase consequences.',
    uiNotes: 'Avoid gore/potion cues.',
  },
  'resource-archive-data': {
    title: 'Archive Data',
    mechanical: 'Research and intel resource.',
    lore: 'Stellar record or data trace, not soul currency.',
    uiNotes: 'Use prism/scan-line motifs.',
  },
  'resource-blood-ring-glass': {
    title: 'Blood Ring Glass',
    mechanical: 'Contaminated strategic material.',
    lore: 'Atrocity-linked vitrified remnant.',
    warning: 'Never present as clean reward. Diplomatic cost applies.',
    uiNotes: 'Never present as clean reward.',
  },
  'resource-siege-lattice-fragment': {
    title: 'Siege Lattice Fragment',
    mechanical: 'Containment/singularity material.',
    lore: 'Black-hole lattice shard and infrastructure fragment.',
    warning: 'Fortification near singularities remains dangerous.',
    uiNotes: 'Avoid web/whirlpool shapes.',
  },
  'resource-macro-labor': {
    title: 'Macro Labor',
    mechanical: 'Production-loop capacity.',
    lore: 'Industrial syntax embedded in macro action-loops.',
    uiNotes: 'Gear-code motif.',
  },
  'resource-command-legitimacy': {
    title: 'Command Legitimacy',
    mechanical: 'Influence and political pressure.',
    lore: 'Ledger seal/audit authority.',
    uiNotes: 'No crown/hero badge.',
  },
  'resource-fabrication-mass': {
    title: 'Fabrication Mass',
    mechanical: 'Build output and construction mass.',
    lore: 'Macro-pressed industrial throughput.',
    uiNotes: 'Avoid generic ore.',
  },
  'resource-research-syntax': {
    title: 'Research Syntax',
    mechanical: 'Science/research output.',
    lore: 'Terminal glyph and archive-prism syntax.',
    uiNotes: 'Avoid generic flask/atom.',
  },
};

const MATERIAL_TOOLTIPS: Record<string, AssetTooltip> = {
  'checksum-alloy': {
    title: 'Checksum Alloy',
    mechanical: 'Hull integrity alloy keyed to checksum audit macros.',
    lore: 'Administrative metal — strength through verified syntax, not heroics.',
    uiNotes: 'Linked to module-defense-checksum-hull.',
  },
  'macro-catalyst': {
    title: 'Macro Catalyst',
    mechanical: 'Catalytic capacity that accelerates macro execution loops.',
    lore: 'Industrial syntax catalyst — macro labor concentrated for burst output.',
    uiNotes: 'Runtime alias for resource-macro-labor production semantics.',
  },
  'obsidian-plate': {
    title: 'Obsidian Plate',
    mechanical: 'Dense defensive plating for singularity-adjacent hull stress.',
    lore: 'Obsidian shell laminate — containment geometry made solid.',
    uiNotes: 'Linked to module-defense-obsidian-shell.',
  },
  'cinder-core': {
    title: 'Cinder Core',
    mechanical: 'High-thrust engine core material for cinderverge thrusters.',
    lore: 'Cinder-verge burn residue — velocity bought with heat and hazard.',
    uiNotes: 'Linked to module-engine-cinderverge-thrusters.',
  },
  'gravity-thread': {
    title: 'Gravity Thread',
    mechanical: 'Curved gravity boundary material for seals and thread engines.',
    lore: 'Partition geometry made tangible — hazard mitigation, not triumph.',
    warning: 'Sealing gravity admits the wound stays open.',
    uiNotes: 'Linked to macro-gravity-thread-seal and gravity-thread engine.',
  },
};

const VALID_SOURCE_BASIS = new Set<SourceBasis>([
  'direct canon',
  'canon-faithful adaptation',
  'interpretive adaptation',
  'mechanical UI necessity',
]);

const FAMILY_KEY_PREFIX: Record<LedgerAssetRecord['family'], string> = {
  resources: 'resource',
  victory: 'victory',
  map: 'map',
  macros: 'macro',
  factions: 'faction',
  fleets: 'fleet',
  planets: 'planet',
  ui: 'ui',
  audio: 'audio',
  events: 'event',
};

export function deriveMechanicalKey(record: Pick<LedgerAssetRecord, 'id' | 'family'>): string {
  const prefix = FAMILY_KEY_PREFIX[record.family];
  const slug = record.id.replace(new RegExp(`^${prefix}-`), '');
  return `${prefix}:${slug}`;
}

function defaultTooltip(record: LedgerAssetRecord): AssetTooltip {
  return {
    title: record.displayName,
    mechanical: record.mechanicalMeaning,
    lore: record.loreMeaning,
  };
}

export function enrichLedgerRecord(record: LedgerAssetRecord): StarsilkAssetRecord {
  const filename = getLedgerFilename(record.plannedFiles);
  const plannedPath = getLedgerPrimaryPath(record.plannedFiles) ?? '';
  const tooltip = RESOURCE_TOOLTIPS[record.id] ?? defaultTooltip(record);

  return {
    id: record.id,
    displayName: record.displayName,
    family: record.family,
    filename,
    plannedPath,
    plannedFiles: record.plannedFiles,
    states: record.states,
    mechanicalMeaning: tooltip.mechanical,
    loreMeaning: tooltip.lore,
    accessibilityLabel: record.accessibilityLabel,
    tooltip,
    testId: record.testId,
    sourceBasis: record.sourceBasis as SourceBasis,
    status: record.status,
    mechanicalKey: deriveMechanicalKey(record),
  };
}

export function getMaterialTooltip(materialId: string): AssetTooltip | undefined {
  return MATERIAL_TOOLTIPS[materialId];
}

export function isValidSourceBasis(value: string): value is SourceBasis {
  return VALID_SOURCE_BASIS.has(value as SourceBasis);
}

export const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const KEBAB_FILENAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)+$/;