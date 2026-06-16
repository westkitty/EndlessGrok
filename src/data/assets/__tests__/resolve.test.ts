import { describe, it, expect } from 'vitest';
import {
  getAssetFallbackIcon,
  getAssetIconName,
  getAssetTestId,
  getAssetTooltip,
  buildRuntimeTooltip,
  resetAssetWarnings,
} from '../resolve';

describe('asset resolution', () => {
  it('lookup by mechanical key works', () => {
    expect(getAssetIconName('resource:food')).toBe('food');
    expect(getAssetTooltip('resource:starsilkThread')?.title).toBe('Starsilk Thread');
  });

  it('missing key returns fallback without throwing', () => {
    resetAssetWarnings();
    expect(getAssetIconName('resource:nonexistent')).toBeTruthy();
    expect(getAssetFallbackIcon('resource:nonexistent')).toBe('research');
    expect(getAssetTestId('resource:nonexistent')).toContain('asset-fallback');
    expect(getAssetTooltip('macro:does_not_exist')).toBeNull();
  });

  it('testId is stable for known assets', () => {
    expect(getAssetTestId('macro:syrin_inerting_mist')).toBe('macro-icon-syrin_inerting_mist');
    expect(getAssetTestId('victory:starbinding')).toBe('victory-starbinding');
  });

  it('buildRuntimeTooltip merges runtime fields', () => {
    const data = buildRuntimeTooltip('resource:credits', { value: 120, delta: '+5' });
    expect(data.title).toBe('Credits');
    expect(data.value).toBe(120);
    expect(data.mechanical).toContain('currency');
  });

  it('starsilk resources use planned fallback icons', () => {
    expect(getAssetIconName('resource:syrinReagent')).toBe('research');
  });
});