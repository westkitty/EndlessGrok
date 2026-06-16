import rawManifest from './assets.manifest.json' with { type: 'json' };
import { normalizeLedgerManifest } from './ledger';
import { enrichLedgerRecord } from './runtimeEnrich';
import { getRuntimeValidationErrors, validateRuntimeManifest } from './runtimeValidation';
import type { AssetFamily } from './types';
import type { AssetManifestRuntime, SourceBasis, StarsilkAssetRecord, StarsilkAssetStatus } from './runtimeTypes';

const MANIFEST_VERSION = 'starsilk-ledger-134-prompted';

let cachedManifest: AssetManifestRuntime | null = null;

function buildIndexes(records: StarsilkAssetRecord[]): AssetManifestRuntime {
  const byId = new Map<string, StarsilkAssetRecord>();
  const byFamily = new Map<AssetFamily, StarsilkAssetRecord[]>();
  const byStatus = new Map<StarsilkAssetStatus, StarsilkAssetRecord[]>();
  const bySourceBasis = new Map<SourceBasis, StarsilkAssetRecord[]>();

  for (const record of records) {
    byId.set(record.id, record);

    const familyList = byFamily.get(record.family) ?? [];
    familyList.push(record);
    byFamily.set(record.family, familyList);

    const statusList = byStatus.get(record.status) ?? [];
    statusList.push(record);
    byStatus.set(record.status, statusList);

    const basisList = bySourceBasis.get(record.sourceBasis) ?? [];
    basisList.push(record);
    bySourceBasis.set(record.sourceBasis, basisList);
  }

  return {
    version: MANIFEST_VERSION,
    recordCount: records.length,
    records,
    byId,
    byFamily,
    byStatus,
    bySourceBasis,
    indexes: {
      resources: byFamily.get('resources') ?? [],
      victory: byFamily.get('victory') ?? [],
      factions: byFamily.get('factions') ?? [],
      events: byFamily.get('events') ?? [],
      fleets: byFamily.get('fleets') ?? [],
      ui: byFamily.get('ui') ?? [],
      audio: byFamily.get('audio') ?? [],
    },
  };
}

export function loadAssetManifest(forceReload = false): AssetManifestRuntime {
  if (cachedManifest && !forceReload) {
    return cachedManifest;
  }

  const ledgerRecords = normalizeLedgerManifest(rawManifest);
  const records = ledgerRecords.map(enrichLedgerRecord);
  cachedManifest = buildIndexes(records);
  return cachedManifest;
}

export function getAssetById(assetId: string): StarsilkAssetRecord | undefined {
  return loadAssetManifest().byId.get(assetId);
}

export function getAssetsByFamily(family: AssetFamily): StarsilkAssetRecord[] {
  return loadAssetManifest().byFamily.get(family) ?? [];
}

export function getAssetsByStatus(status: StarsilkAssetStatus): StarsilkAssetRecord[] {
  return loadAssetManifest().byStatus.get(status) ?? [];
}

export function getAssetsBySourceBasis(sourceBasis: SourceBasis): StarsilkAssetRecord[] {
  return loadAssetManifest().bySourceBasis.get(sourceBasis) ?? [];
}

export function getRuntimeManifestStats(): Record<string, number> {
  const manifest = loadAssetManifest();
  const stats: Record<string, number> = { total: manifest.recordCount };
  for (const [family, records] of manifest.byFamily) {
    stats[`family:${family}`] = records.length;
  }
  for (const [status, records] of manifest.byStatus) {
    stats[`status:${status}`] = records.length;
  }
  return stats;
}

export function assertRuntimeManifestIntegrity(
  options: { fileExists?: (path: string) => boolean } = {},
): void {
  const issues = validateRuntimeManifest(loadAssetManifest().records, options);
  const errors = getRuntimeValidationErrors(issues);
  if (errors.length > 0) {
    throw new Error(`Runtime manifest invalid: ${errors.map(e => `${e.assetId}: ${e.message}`).join('; ')}`);
  }
}