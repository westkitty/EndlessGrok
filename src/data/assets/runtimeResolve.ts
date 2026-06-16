import { getAssetById as getManifestAssetById } from './runtimeManifest';
import { resolveAssetId } from './assetIdReconciliation';
import type { AssetTooltipSpec } from './types';
import type { StarsilkAssetRecord } from './runtimeTypes';

export function getManifestRecordForKey(assetOrKey: string): StarsilkAssetRecord | undefined {
  const canonical = resolveAssetId(assetOrKey);
  return getManifestAssetById(canonical);
}

export function manifestTooltipToSpec(record: StarsilkAssetRecord): AssetTooltipSpec {
  return {
    title: record.tooltip.title,
    mechanical: record.tooltip.mechanical,
    lore: record.tooltip.lore,
    warning: record.tooltip.warning,
    canonLabel: record.sourceBasis === 'direct canon'
      ? 'direct_canon'
      : record.sourceBasis === 'interpretive adaptation'
        ? 'interpretive'
        : 'canon_faithful',
  };
}

export function getManifestBackedTooltip(assetOrKey: string): AssetTooltipSpec | null {
  const record = getManifestRecordForKey(assetOrKey);
  if (!record) return null;
  return manifestTooltipToSpec(record);
}

export function getManifestTestId(assetOrKey: string): string | null {
  const record = getManifestRecordForKey(assetOrKey);
  return record?.testId ?? null;
}