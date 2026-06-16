import { RESOURCE_ASSETS } from './records/resources';
import { VICTORY_ASSETS } from './records/victory';
import { MACRO_ASSETS, MACRO_EFFECT_ASSETS } from './records/macros';
import { MAP_ASSETS } from './records/map';
import type { AssetFamily, AssetRecord, AssetStatus } from './types';

export const ASSET_REGISTRY: AssetRecord[] = [
  ...RESOURCE_ASSETS,
  ...VICTORY_ASSETS,
  ...MACRO_ASSETS,
  ...MACRO_EFFECT_ASSETS,
  ...MAP_ASSETS,
];

const byId = new Map<string, AssetRecord>();
const byMechanicalKey = new Map<string, AssetRecord>();

for (const record of ASSET_REGISTRY) {
  byId.set(record.id, record);
  byMechanicalKey.set(record.mechanicalKey, record);
}

const VALID_FAMILIES = new Set<AssetFamily>([
  'resources', 'victory', 'map', 'macros', 'factions', 'fleets', 'planets', 'ui', 'audio', 'events',
]);

const VALID_STATUS = new Set<AssetStatus>([
  'planned', 'spec_ready', 'generated', 'integrated', 'deprecated',
]);

export interface RegistryValidationError {
  assetId: string;
  message: string;
}

export function validateRegistry(records: AssetRecord[] = ASSET_REGISTRY): RegistryValidationError[] {
  const errors: RegistryValidationError[] = [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();

  for (const record of records) {
    if (seenIds.has(record.id)) {
      errors.push({ assetId: record.id, message: 'Duplicate asset id' });
    }
    seenIds.add(record.id);

    if (seenKeys.has(record.mechanicalKey)) {
      errors.push({ assetId: record.id, message: `Duplicate mechanical key ${record.mechanicalKey}` });
    }
    seenKeys.add(record.mechanicalKey);

    if (!VALID_FAMILIES.has(record.family)) {
      errors.push({ assetId: record.id, message: `Invalid family ${record.family}` });
    }
    if (!VALID_STATUS.has(record.status)) {
      errors.push({ assetId: record.id, message: `Invalid status ${record.status}` });
    }
    if (!record.tooltip.title || !record.tooltip.mechanical) {
      errors.push({ assetId: record.id, message: 'Tooltip requires title and mechanical summary' });
    }
    if (!record.testId) {
      errors.push({ assetId: record.id, message: 'Missing testId' });
    }
    if (record.status === 'integrated' && !record.iconName && !record.fallbackIconName) {
      errors.push({ assetId: record.id, message: 'Integrated assets need iconName or fallbackIconName' });
    }
  }

  return errors;
}

export function assertRegistryIntegrity(records: AssetRecord[] = ASSET_REGISTRY): void {
  const errors = validateRegistry(records);
  if (errors.length > 0) {
    throw new Error(`Asset registry invalid: ${errors.map(e => `${e.assetId}: ${e.message}`).join('; ')}`);
  }
}

export function getAssetById(assetId: string): AssetRecord | undefined {
  return byId.get(assetId);
}

export function getAssetByMechanicalKey(mechanicalKey: string): AssetRecord | undefined {
  return byMechanicalKey.get(mechanicalKey);
}

export function getAssetsByFamily(family: AssetFamily): AssetRecord[] {
  return ASSET_REGISTRY.filter(r => r.family === family);
}

export function getRegistryStats(): Record<string, number> {
  const stats: Record<string, number> = { total: ASSET_REGISTRY.length };
  for (const record of ASSET_REGISTRY) {
    stats[`family:${record.family}`] = (stats[`family:${record.family}`] ?? 0) + 1;
    stats[`status:${record.status}`] = (stats[`status:${record.status}`] ?? 0) + 1;
  }
  return stats;
}

assertRegistryIntegrity();