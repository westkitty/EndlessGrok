import { getMaterialTooltip } from '../assets/runtimeEnrich';
import type { StarsilkResourceRecord } from './types';

function resourceRecord(
  key: StarsilkResourceRecord['key'],
  manifestAssetId: string,
  displayName: string,
  mechanical: string,
  lore: string,
  options: {
    warning?: string;
    uiNotes?: string;
    iconAssetId?: string;
    sourceBasis?: StarsilkResourceRecord['sourceBasis'];
  } = {},
): StarsilkResourceRecord {
  const iconAssetId = options.iconAssetId ?? manifestAssetId;
  return {
    key,
    assetId: manifestAssetId,
    manifestAssetId,
    displayName,
    mechanicalMeaning: mechanical,
    loreMeaning: lore,
    tooltip: {
      title: displayName,
      mechanical,
      lore,
      warning: options.warning,
      uiNotes: options.uiNotes,
    },
    warning: options.warning,
    iconAssetId,
    testId: manifestAssetId,
    sourceBasis: options.sourceBasis ?? 'direct canon',
    status: 'prompted',
  };
}

function materialRecord(
  key: StarsilkResourceRecord['key'],
  materialId: string,
  manifestAssetId: string,
  sourceBasis: StarsilkResourceRecord['sourceBasis'] = 'direct canon',
): StarsilkResourceRecord {
  const tooltip = getMaterialTooltip(materialId);
  if (!tooltip) {
    throw new Error(`Missing material tooltip for ${materialId}`);
  }
  return {
    key,
    assetId: materialId,
    manifestAssetId,
    displayName: tooltip.title,
    mechanicalMeaning: tooltip.mechanical,
    loreMeaning: tooltip.lore,
    tooltip,
    warning: tooltip.warning,
    iconAssetId: manifestAssetId,
    testId: materialId,
    sourceBasis,
    status: 'prompted',
  };
}

export const STARSILK_RESOURCE_RECORDS: StarsilkResourceRecord[] = [
  resourceRecord(
    'archiveData',
    'resource-archive-data',
    'Archive Data',
    'Research and intel resource.',
    'Stellar record or data trace, not soul currency.',
    { uiNotes: 'Use prism/scan-line motifs.' },
  ),
  resourceRecord(
    'starsilkThread',
    'resource-starsilk-thread',
    'Starsilk Thread',
    'Rare strategic resource for high-risk Starsilk systems.',
    'Dangerous systemic filament, not fuel.',
    { warning: 'Thread misuse escalates diplomatic and hazard pressure.', uiNotes: 'Warning-coded ribbon/barcode icon.' },
  ),
  resourceRecord(
    'bloodRingGlass',
    'resource-blood-ring-glass',
    'Blood Ring Glass',
    'Contaminated strategic material.',
    'Atrocity-linked vitrified remnant.',
    { warning: 'Never present as clean reward.', uiNotes: 'Never present as clean reward.' },
  ),
  resourceRecord(
    'siegeLatticeFragment',
    'resource-siege-lattice-fragment',
    'Siege Lattice Fragment',
    'Containment/singularity material.',
    'Black-hole lattice shard and infrastructure fragment.',
    { warning: 'Fortification near singularities remains dangerous.', uiNotes: 'Avoid web/whirlpool shapes.' },
  ),
  materialRecord('checksumAlloy', 'checksum-alloy', 'module-defense-checksum-hull'),
  resourceRecord(
    'macroCatalyst',
    'resource-macro-labor',
    'Macro Catalyst',
    'Catalytic capacity that accelerates macro execution loops.',
    'Industrial syntax catalyst — macro labor concentrated for burst output.',
    { iconAssetId: 'resource-macro-labor', sourceBasis: 'mechanical UI necessity', uiNotes: 'Gear-code motif.' },
  ),
  resourceRecord(
    'syrinReagent',
    'resource-syrin-reagent',
    'Syrin Reagent',
    'Inerting and bypass resource.',
    'Containment vapor or droplet, not blood.',
    { warning: 'Inerting buys time; it does not erase consequences.', uiNotes: 'Avoid gore/potion cues.' },
  ),
  materialRecord('obsidianPlate', 'obsidian-plate', 'module-defense-obsidian-shell'),
  materialRecord('cinderCore', 'cinder-core', 'module-engine-cinderverge-thrusters'),
  materialRecord('gravityThread', 'gravity-thread', 'macro-gravity-thread-seal'),
];