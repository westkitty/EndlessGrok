import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
import {
  loadAssetManifest,
  getAssetById,
  getAssetsByFamily,
  getAssetsByStatus,
  getAssetsBySourceBasis,
} from '../runtimeManifest';
import { getRuntimeValidationErrors, validateRuntimeManifest } from '../runtimeValidation';

describe('runtime manifest', () => {
  it('loads 134 enriched records', () => {
    const manifest = loadAssetManifest();
    expect(manifest.recordCount).toBe(134);
    expect(manifest.records.every(r => r.tooltip.mechanical && r.tooltip.lore)).toBe(true);
  });

  it('indexes by family and status', () => {
    expect(getAssetsByFamily('resources')).toHaveLength(10);
    expect(getAssetsByStatus('prompted')).toHaveLength(91);
    expect(getAssetsByStatus('generated-unverified')).toHaveLength(24);
    expect(getAssetsByStatus('generated-verified')).toHaveLength(19);
    expect(getAssetsBySourceBasis('direct canon').length).toBeGreaterThan(0);
  });

  it('resolves assets by id', () => {
    const record = getAssetById('resource-starsilk-thread');
    expect(record?.mechanicalKey).toBe('resource:starsilk-thread');
    expect(record?.tooltip.warning).toBeTruthy();
  });

  it('passes runtime validation when generated files exist', () => {
    const errors = getRuntimeValidationErrors(
      validateRuntimeManifest(loadAssetManifest().records, {
        fileExists: p => existsSync(resolve(repoRoot, p)),
      }),
    );
    expect(errors).toEqual([]);
  });
});