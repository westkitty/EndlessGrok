import rawManifest from './assets.manifest.json' with { type: 'json' };
import { normalizeLedgerManifest } from './ledger';
import type { LedgerAssetRecord } from './ledger';

export const ASSETS_MANIFEST: LedgerAssetRecord[] = normalizeLedgerManifest(rawManifest);

export function getLedgerAssetById(assetId: string): LedgerAssetRecord | undefined {
  return ASSETS_MANIFEST.find(record => record.id === assetId);
}

export function getLedgerAssetsByFamily(family: LedgerAssetRecord['family']): LedgerAssetRecord[] {
  return ASSETS_MANIFEST.filter(record => record.family === family);
}