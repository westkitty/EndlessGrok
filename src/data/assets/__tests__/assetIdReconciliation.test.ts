import { describe, it, expect } from 'vitest';
import {
  getCanonicalAssetId,
  resolveAssetId,
  getAssetIdAliases,
  detectAssetIdConflicts,
  assertNoDuplicateMechanicalKeys,
  validateCanonicalIdScheme,
  listLegacyAssetIds,
} from '../assetIdReconciliation';
import { ASSET_REGISTRY, getAssetById } from '../registry';

describe('asset ID reconciliation', () => {
  it('maps legacy resource ids to canonical manifest ids', () => {
    expect(getCanonicalAssetId('starsilk-thread')).toBe('resource-starsilk-thread');
    expect(resolveAssetId('resource:starsilkThread')).toBe('resource-starsilk-thread');
  });

  it('resolves legacy and canonical ids to same record', () => {
    const legacy = getAssetById('starsilk-thread');
    const canonical = getAssetById('resource-starsilk-thread');
    expect(legacy).toBeDefined();
    expect(canonical).toBe(legacy);
  });

  it('maps macro underscore ids to hyphenated canonical ids', () => {
    expect(getCanonicalAssetId('macro-syrin_inerting_mist')).toBe('macro-syrin-inerting-mist');
    expect(getAssetById('macro-syrin-inerting-mist')?.mechanicalKey).toBe('macro:syrin_inerting_mist');
  });

  it('returns alias lists including legacy and canonical', () => {
    const aliases = getAssetIdAliases('resource-starsilk-thread');
    expect(aliases).toContain('resource-starsilk-thread');
    expect(aliases).toContain('starsilk-thread');
  });

  it('has no canonical id conflicts or duplicate mechanical keys', () => {
    expect(detectAssetIdConflicts(ASSET_REGISTRY)).toEqual([]);
    expect(assertNoDuplicateMechanicalKeys(ASSET_REGISTRY)).toEqual([]);
  });

  it('validates canonical scheme for planned Starsilk assets', () => {
    const errors = validateCanonicalIdScheme(ASSET_REGISTRY);
    expect(errors).toEqual([]);
  });

  it('lists legacy ids for migration reference', () => {
    expect(listLegacyAssetIds().length).toBeGreaterThan(0);
  });
});