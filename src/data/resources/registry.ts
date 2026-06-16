import { getAssetById } from '../assets/runtimeManifest';
import { STARSILK_RESOURCE_RECORDS } from './records';
import type { StarsilkResourceKey, StarsilkResourceRecord } from './types';

const byKey = new Map<StarsilkResourceKey, StarsilkResourceRecord>(
  STARSILK_RESOURCE_RECORDS.map(record => [record.key, record]),
);

const byAssetId = new Map<string, StarsilkResourceRecord>(
  STARSILK_RESOURCE_RECORDS.map(record => [record.assetId, record]),
);

export interface ResourceValidationError {
  key: string;
  message: string;
}

export function getStarsilkResource(key: StarsilkResourceKey): StarsilkResourceRecord | undefined {
  return byKey.get(key);
}

export function getStarsilkResourceByAssetId(assetId: string): StarsilkResourceRecord | undefined {
  return byAssetId.get(assetId);
}

export function getAllStarsilkResources(): StarsilkResourceRecord[] {
  return [...STARSILK_RESOURCE_RECORDS];
}

export function validateStarsilkResources(): ResourceValidationError[] {
  const errors: ResourceValidationError[] = [];
  const seenKeys = new Set<string>();
  const seenTestIds = new Set<string>();

  for (const record of STARSILK_RESOURCE_RECORDS) {
    if (seenKeys.has(record.key)) {
      errors.push({ key: record.key, message: 'Duplicate resource key' });
    }
    seenKeys.add(record.key);

    if (seenTestIds.has(record.testId)) {
      errors.push({ key: record.key, message: `Duplicate testId: ${record.testId}` });
    }
    seenTestIds.add(record.testId);

    if (!record.tooltip.mechanical || !record.tooltip.lore) {
      errors.push({ key: record.key, message: 'Tooltip requires mechanical and lore' });
    }

    const manifestAsset = getAssetById(record.manifestAssetId);
    if (!manifestAsset) {
      errors.push({ key: record.key, message: `Manifest asset missing: ${record.manifestAssetId}` });
    }

    const iconAsset = getAssetById(record.iconAssetId);
    if (!iconAsset) {
      errors.push({ key: record.key, message: `Icon asset missing: ${record.iconAssetId}` });
    }
  }

  return errors;
}