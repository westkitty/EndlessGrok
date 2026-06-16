import { describe, it, expect } from 'vitest';
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
    expect(getAssetsByStatus('prompted')).toHaveLength(134);
    expect(getAssetsBySourceBasis('direct canon').length).toBeGreaterThan(0);
  });

  it('resolves assets by id', () => {
    const record = getAssetById('resource-starsilk-thread');
    expect(record?.mechanicalKey).toBe('resource:starsilk-thread');
    expect(record?.tooltip.warning).toBeTruthy();
  });

  it('passes runtime validation', () => {
    const errors = getRuntimeValidationErrors(
      validateRuntimeManifest(loadAssetManifest().records, { fileExists: () => false }),
    );
    expect(errors).toEqual([]);
  });
});