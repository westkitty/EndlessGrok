import { describe, it, expect } from 'vitest';
import {
  ASSET_REGISTRY,
  getAssetByMechanicalKey,
  getAssetsByFamily,
  getRegistryStats,
  validateRegistry,
} from '../registry';

describe('asset registry', () => {
  it('loads without validation errors', () => {
    expect(validateRegistry()).toEqual([]);
  });

  it('resolves resource mechanical keys', () => {
    const asset = getAssetByMechanicalKey('resource:credits');
    expect(asset?.displayName).toBe('Credits');
    expect(asset?.testId).toBe('resource-credits');
  });

  it('has victory and macro families', () => {
    expect(getAssetsByFamily('victory').length).toBeGreaterThanOrEqual(5);
    expect(getAssetsByFamily('macros').length).toBeGreaterThanOrEqual(8);
  });

  it('tracks registry stats', () => {
    const stats = getRegistryStats();
    expect(stats.total).toBe(ASSET_REGISTRY.length);
    expect(stats['family:resources']).toBeGreaterThanOrEqual(14);
  });
});