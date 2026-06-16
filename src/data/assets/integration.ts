import { getAssetByMechanicalKey, ASSET_REGISTRY } from './registry';
import { manifestToAssetRecords, normalizeManifestMechanicalKey } from './manifest';
import type { AssetManifest } from './manifest';
import type { AssetRecord } from './types';

export interface RegistryConflict {
  mechanicalKey: string;
  existingId: string;
  incomingId: string;
  message: string;
}

export interface RegistryPatchPreview {
  batchId: string;
  batchName: string;
  toAdd: AssetRecord[];
  toUpdate: Array<{ before: AssetRecord; after: AssetRecord }>;
  conflicts: RegistryConflict[];
  missingFiles: string[];
  unchanged: string[];
  suggestedDocRows: string[];
}

export function detectRegistryConflicts(
  incoming: AssetRecord[],
  existing: AssetRecord[] = ASSET_REGISTRY,
): RegistryConflict[] {
  const conflicts: RegistryConflict[] = [];
  const existingByKey = new Map(existing.map(r => [r.mechanicalKey, r]));

  for (const record of incoming) {
    const prev = existingByKey.get(record.mechanicalKey);
    if (!prev) continue;
    if (prev.id !== record.id) {
      conflicts.push({
        mechanicalKey: record.mechanicalKey,
        existingId: prev.id,
        incomingId: record.id,
        message: `Mechanical key ${record.mechanicalKey} already owned by ${prev.id}, manifest proposes ${record.id}`,
      });
    }
  }

  return conflicts;
}

export function assertRegistryMechanicalKeyStable(
  before: AssetRecord,
  after: AssetRecord,
): string | null {
  if (normalizeManifestMechanicalKey(before.mechanicalKey) !== normalizeManifestMechanicalKey(after.mechanicalKey)) {
    return `Mechanical key change rejected: ${before.mechanicalKey} → ${after.mechanicalKey}`;
  }
  return null;
}

export function mergeManifestRecordsWithRegistry(
  incoming: AssetRecord[],
  existing: AssetRecord[] = ASSET_REGISTRY,
  options: { fileExists?: (path: string) => boolean } = {},
): { merged: AssetRecord[]; conflicts: RegistryConflict[]; rejected: string[] } {
  const fileExists = options.fileExists ?? (() => true);
  const conflicts = detectRegistryConflicts(incoming, existing);
  const conflictKeys = new Set(conflicts.map(c => c.mechanicalKey));
  const rejected: string[] = [];
  const byKey = new Map(existing.map(r => [r.mechanicalKey, { ...r }]));

  for (const record of incoming) {
    if (conflictKeys.has(record.mechanicalKey)) continue;

    const prev = byKey.get(record.mechanicalKey);
    if (prev) {
      const stableErr = assertRegistryMechanicalKeyStable(prev, record);
      if (stableErr) {
        rejected.push(stableErr);
        continue;
      }
      let nextStatus = record.status;
      if (nextStatus === 'integrated') {
        const path = record.plannedFiles?.svg;
        if (path && !fileExists(path)) {
          rejected.push(`Cannot mark ${record.mechanicalKey} integrated — missing file ${path}`);
          nextStatus = prev.status;
        }
      }
      byKey.set(record.mechanicalKey, { ...prev, ...record, status: nextStatus });
    } else {
      if (record.status === 'integrated') {
        const path = record.plannedFiles?.svg;
        if (path && !fileExists(path)) {
          rejected.push(`Cannot add integrated ${record.mechanicalKey} — missing file ${path}`);
          byKey.set(record.mechanicalKey, { ...record, status: 'planned' });
          continue;
        }
      }
      byKey.set(record.mechanicalKey, record);
    }
  }

  return { merged: [...byKey.values()], conflicts, rejected };
}

export function getRegistryPatchPreview(
  manifest: AssetManifest,
  options: { fileExists?: (path: string) => boolean; existing?: AssetRecord[] } = {},
): RegistryPatchPreview {
  const existing = options.existing ?? ASSET_REGISTRY;
  const fileExists = options.fileExists ?? (() => false);
  const incoming = manifestToAssetRecords(manifest);

  const conflicts = detectRegistryConflicts(incoming, existing);
  const conflictKeys = new Set(conflicts.map(c => c.mechanicalKey));

  const toAdd: AssetRecord[] = [];
  const toUpdate: RegistryPatchPreview['toUpdate'] = [];
  const missingFiles: string[] = [];
  const unchanged: string[] = [];

  for (const record of incoming) {
    if (conflictKeys.has(record.mechanicalKey)) continue;

    const path = record.plannedFiles?.svg;
    if (record.status === 'integrated' && path && !fileExists(path)) {
      missingFiles.push(path);
    }

    const prev = getAssetByMechanicalKey(record.mechanicalKey) ?? existing.find(r => r.mechanicalKey === record.mechanicalKey);
    if (!prev) {
      toAdd.push(record);
    } else if (JSON.stringify(prev) !== JSON.stringify({ ...prev, ...record })) {
      toUpdate.push({ before: prev, after: { ...prev, ...record } });
    } else {
      unchanged.push(record.mechanicalKey);
    }
  }

  const suggestedDocRows = [...toAdd, ...toUpdate.map(u => u.after)].map(
    r => `| ${r.id} | ${r.plannedFiles?.svg ?? ''} | ${r.family} | ${r.mechanicalMeaning.slice(0, 40)} | ${r.status} | manifest | generated | ${r.testId} | |`,
  );

  return {
    batchId: manifest.batchId,
    batchName: manifest.batchName,
    toAdd,
    toUpdate,
    conflicts,
    missingFiles,
    unchanged,
    suggestedDocRows,
  };
}