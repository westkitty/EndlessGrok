import type { AssetFamily, AssetRecord } from './types';

/** Legacy registry id → canonical manifest-aligned id */
export const LEGACY_TO_CANONICAL: Record<string, string> = {
  'starsilk-thread': 'resource-starsilk-thread',
  'inert-starsilk': 'resource-inert-starsilk',
  'syrin-reagent': 'resource-syrin-reagent',
  'archive-data': 'resource-archive-data',
  'blood-ring-glass': 'resource-blood-ring-glass',
  'siege-lattice-fragment': 'resource-siege-lattice-fragment',
  'macro-local_checksum_audit': 'macro-local-checksum-audit',
  'macro-first_dirt_protocol': 'macro-first-dirt-protocol',
  'macro-syrin_inerting_mist': 'macro-syrin-inerting-mist',
  'macro-siege_lattice_anchor': 'macro-siege-lattice-anchor',
  'macro-archive_extraction_loop': 'macro-archive-extraction-loop',
  'macro-drakken_biosphere_render': 'macro-drakken-biosphere-render',
  'macro-gravity_thread_seal': 'macro-gravity-thread-seal',
  'macro-counter_macro_scrub': 'macro-counter-macro-scrub',
  'fleet-scout': 'fleet-scout-icon',
  'fleet-colony': 'fleet-colony-icon',
  'fleet-military': 'fleet-military-icon',
  'fleet-siege': 'fleet-defense-icon',
  'fleet-stance-passive': 'fleet-combat-risk-low',
  'fleet-stance-aggressive': 'fleet-combat-risk-high',
};

const MECHANICAL_TO_CANONICAL: Record<string, string> = {
  'resource:starsilkThread': 'resource-starsilk-thread',
  'resource:inertStarsilk': 'resource-inert-starsilk',
  'resource:syrinReagent': 'resource-syrin-reagent',
  'resource:archiveData': 'resource-archive-data',
  'resource:bloodRingGlass': 'resource-blood-ring-glass',
  'resource:siegeLatticeFragment': 'resource-siege-lattice-fragment',
  'macro:local_checksum_audit': 'macro-local-checksum-audit',
  'macro:first_dirt_protocol': 'macro-first-dirt-protocol',
  'macro:syrin_inerting_mist': 'macro-syrin-inerting-mist',
  'macro:siege_lattice_anchor': 'macro-siege-lattice-anchor',
  'macro:archive_extraction_loop': 'macro-archive-extraction-loop',
  'macro:drakken_biosphere_render': 'macro-drakken-biosphere-render',
  'macro:gravity_thread_seal': 'macro-gravity-thread-seal',
  'macro:counter_macro_scrub': 'macro-counter-macro-scrub',
  'victory:starbinding': 'victory-starbinding',
  'victory:syrinInerting': 'victory-syrin-inerting',
  'victory:ledgerDominion': 'victory-ledger-dominion',
  'victory:bloodEclipse': 'victory-blood-eclipse',
  'victory:archiveContinuity': 'victory-archive-continuity',
  'fleet:scout': 'fleet-scout-icon',
  'fleet:colony': 'fleet-colony-icon',
  'fleet:military': 'fleet-military-icon',
  'map:stable': 'map-star-normal',
  'map:collapsed_black_hole': 'map-collapsed-star',
  'map:singularity_hazard': 'map-hazard-singularity',
  'map:unstable': 'map-hazard-unstable-star',
  'map:collapsing': 'map-hazard-unstable-star',
  'map:singularity_sealed': 'map-hazard-macro-sealed-system',
  'map:starbinding_targeted': 'map-starbinding-target',
  'map:strategic_deposit': 'map-deposit-starsilk-leak',
  'map:archive_star': 'map-deposit-archive-data',
  'map:inerted_system': 'map-deposit-syrin-trace',
  'map:hazard_suppressed': 'map-deposit-syrin-trace',
};

const CANONICAL_TO_LEGACY = Object.fromEntries(
  Object.entries(LEGACY_TO_CANONICAL).map(([legacy, canonical]) => [canonical, legacy]),
);

export function getCanonicalAssetId(assetId: string): string {
  return LEGACY_TO_CANONICAL[assetId] ?? assetId;
}

export function resolveAssetId(assetIdOrKey: string): string {
  if (MECHANICAL_TO_CANONICAL[assetIdOrKey]) {
    return MECHANICAL_TO_CANONICAL[assetIdOrKey];
  }
  const colon = assetIdOrKey.indexOf(':');
  if (colon > 0) {
    const mapped = MECHANICAL_TO_CANONICAL[assetIdOrKey];
    if (mapped) return mapped;
  }
  return getCanonicalAssetId(assetIdOrKey);
}

export function getAssetIdAliases(assetId: string): string[] {
  const canonical = getCanonicalAssetId(assetId);
  const legacy = CANONICAL_TO_LEGACY[canonical];
  const aliases = new Set<string>([assetId, canonical]);
  if (legacy) aliases.add(legacy);
  return [...aliases];
}

export function listLegacyAssetIds(): string[] {
  return Object.keys(LEGACY_TO_CANONICAL);
}

export interface AssetIdConflict {
  assetId: string;
  message: string;
}

export function detectAssetIdConflicts(records: AssetRecord[]): AssetIdConflict[] {
  const conflicts: AssetIdConflict[] = [];
  const canonicalOwners = new Map<string, string>();

  for (const record of records) {
    const canonical = getCanonicalAssetId(record.id);
    const prev = canonicalOwners.get(canonical);
    if (prev && prev !== record.id) {
      conflicts.push({
        assetId: record.id,
        message: `Canonical id ${canonical} claimed by ${prev} and ${record.id}`,
      });
    }
    canonicalOwners.set(canonical, record.id);
  }

  return conflicts;
}

export function assertNoDuplicateMechanicalKeys(records: AssetRecord[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  for (const record of records) {
    const prev = seen.get(record.mechanicalKey);
    if (prev) {
      errors.push(`Duplicate mechanical key ${record.mechanicalKey}: ${prev} and ${record.id}`);
    }
    seen.set(record.mechanicalKey, record.id);
  }
  return errors;
}

const FAMILY_PREFIX: Partial<Record<AssetFamily, string>> = {
  resources: 'resource-',
  victory: 'victory-',
  macros: 'macro-',
  events: 'event-',
  factions: 'faction-',
  fleets: 'fleet-',
  audio: 'audio-',
};

export function validateCanonicalIdScheme(records: AssetRecord[]): string[] {
  const errors: string[] = [];
  for (const record of records) {
    const prefix = FAMILY_PREFIX[record.family];
    if (!prefix) continue;
    if (record.status === 'integrated' && !record.iconName) continue;
    const canonical = getCanonicalAssetId(record.id);
    if (record.family === 'resources' && record.status === 'planned') {
      if (!canonical.startsWith('resource-')) {
        errors.push(`${record.id}: planned Starsilk resource should use resource- prefix`);
      }
    }
    if (record.family === 'macros' && record.status === 'planned') {
      if (!canonical.startsWith('macro-')) {
        errors.push(`${record.id}: planned macro should use macro- prefix`);
      }
      if (canonical.includes('_')) {
        errors.push(`${record.id}: macro canonical id must not contain underscores`);
      }
    }
    if (record.family === 'victory' && !canonical.startsWith('victory-')) {
      errors.push(`${record.id}: victory asset should use victory- prefix`);
    }
  }
  return errors;
}