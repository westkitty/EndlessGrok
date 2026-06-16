import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  detectRegistryConflicts,
  getRegistryPatchPreview,
  mergeManifestRecordsWithRegistry,
  assertRegistryMechanicalKeyStable,
} from '../integration';
import { manifestToAssetRecords, type AssetManifest } from '../manifest';
import { getAssetByMechanicalKey } from '../registry';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../__fixtures__/manifests');
const repoRoot = resolve(fixturesDir, '../../../../..');

function loadFixture(name: string): AssetManifest {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8')) as AssetManifest;
}

describe('manifest registry integration', () => {
  it('preview shows update for existing mechanical key', () => {
    const manifest = loadFixture('planned-batch.json');
    const preview = getRegistryPatchPreview(manifest, { fileExists: p => existsSync(resolve(repoRoot, p)) });
    expect(preview.toUpdate.length + preview.unchanged.length).toBeGreaterThan(0);
    expect(preview.conflicts).toEqual([]);
  });

  it('detects id conflict on same mechanical key', () => {
    const existing = getAssetByMechanicalKey('resource:credits')!;
    const incoming = [{ ...existing, id: 'different-id' }];
    const conflicts = detectRegistryConflicts(incoming);
    expect(conflicts.length).toBe(1);
  });

  it('rejects mechanical key changes', () => {
    const before = getAssetByMechanicalKey('resource:food')!;
    const after = { ...before, mechanicalKey: 'resource:food2' };
    expect(assertRegistryMechanicalKeyStable(before, after)).toContain('rejected');
  });

  it('merge dry-run promotes integrated only when file exists', () => {
    const manifest = loadFixture('integrated-batch.json');
    const records = manifestToAssetRecords(manifest);
    const { rejected } = mergeManifestRecordsWithRegistry(records, undefined, {
      fileExists: () => false,
    });
    expect(rejected.some(r => r.includes('integrated'))).toBe(true);
  });

  it('preview is deterministic', () => {
    const manifest = loadFixture('planned-batch.json');
    const a = getRegistryPatchPreview(manifest);
    const b = getRegistryPatchPreview(manifest);
    expect(a.toAdd.length).toBe(b.toAdd.length);
    expect(a.toUpdate.length).toBe(b.toUpdate.length);
  });
});