import { describe, it, expect } from 'vitest';
import {
  getCanonicalAssetPath,
  getPublicAssetPath,
  isKnownAssetFamily,
  isSafeAssetPath,
  publicAssetPathToUrl,
  CANONICAL_FAMILY_DIRS,
} from '../paths';

describe('asset paths', () => {
  it('maps family to canonical path', () => {
    expect(getCanonicalAssetPath('macros', 'syrin_inerting_mist.svg')).toBe(
      'src/assets/icons/macros/syrin_inerting_mist.svg',
    );
  });

  it('rejects unsafe paths', () => {
    expect(isSafeAssetPath('../../.env/x.svg')).toBe(false);
    expect(isSafeAssetPath('/etc/passwd')).toBe(false);
    expect(isSafeAssetPath('node_modules/evil.svg')).toBe(false);
  });

  it('accepts safe repo-relative svg paths', () => {
    expect(isSafeAssetPath('src/assets/icons/resources/credits.svg')).toBe(true);
    expect(isSafeAssetPath('public/assets/icons/resources/resource-starsilk-thread.svg')).toBe(true);
  });

  it('maps public asset paths to browser URLs', () => {
    const path = getPublicAssetPath('resources', 'resource-starsilk-thread.svg');
    expect(path).toBe('public/assets/icons/resources/resource-starsilk-thread.svg');
    expect(publicAssetPathToUrl(path)).toBe('/assets/icons/resources/resource-starsilk-thread.svg');
  });

  it('rejects unknown families', () => {
    expect(isKnownAssetFamily('widgets')).toBe(false);
    expect(isKnownAssetFamily('resources')).toBe(true);
  });

  it('defines canonical dirs for all families', () => {
    expect(Object.keys(CANONICAL_FAMILY_DIRS).length).toBeGreaterThanOrEqual(10);
  });
});