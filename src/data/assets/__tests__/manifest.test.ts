import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  validateAssetManifest,
  getManifestValidationErrors,
  manifestAssetToAssetRecord,
  containsProhibitedLanguage,
  type AssetManifest,
} from '../manifest';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../__fixtures__/manifests');

function loadFixture(name: string): AssetManifest {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8')) as AssetManifest;
}

const repoRoot = resolve(fixturesDir, '../../../../..');

function repoFileExists(relativePath: string): boolean {
  return existsSync(resolve(repoRoot, relativePath));
}

describe('asset manifest contract', () => {
  it('valid planned manifest passes without file requirement', () => {
    const manifest = loadFixture('planned-batch.json');
    const errors = getManifestValidationErrors(validateAssetManifest(manifest));
    expect(errors).toEqual([]);
  });

  it('valid integrated manifest passes when file exists', () => {
    const manifest = loadFixture('integrated-batch.json');
    const errors = getManifestValidationErrors(validateAssetManifest(manifest, { fileExists: repoFileExists }));
    expect(errors).toEqual([]);
  });

  it('rejects missing mechanical key', () => {
    const manifest = loadFixture('invalid-missing-key.json');
    const errors = getManifestValidationErrors(validateAssetManifest(manifest));
    expect(errors.some(e => e.field === 'mechanicalKey')).toBe(true);
  });

  it('rejects unsafe path', () => {
    const manifest = loadFixture('invalid-unsafe-path.json');
    const errors = getManifestValidationErrors(validateAssetManifest(manifest));
    expect(errors.some(e => e.message.includes('Unsafe'))).toBe(true);
  });

  it('rejects prohibited spider language', () => {
    const manifest = loadFixture('invalid-prohibited-language.json');
    const errors = getManifestValidationErrors(validateAssetManifest(manifest));
    expect(errors.length).toBeGreaterThan(0);
    expect(containsProhibitedLanguage('spider web motif')).toBeTruthy();
  });

  it('rejects integrated asset with missing file', () => {
    const manifest = loadFixture('invalid-missing-integrated-file.json');
    const errors = getManifestValidationErrors(validateAssetManifest(manifest, { fileExists: () => false }));
    expect(errors.some(e => e.message.includes('missing'))).toBe(true);
  });

  it('converts manifest entry to registry record', () => {
    const manifest = loadFixture('planned-batch.json');
    const record = manifestAssetToAssetRecord(manifest.assets[0]);
    expect(record.mechanicalKey).toBe('resource:starsilkThread');
    expect(record.tooltip.mechanical).toContain('strategic');
    expect(record.testId).toBe('resource-starsilk-thread');
  });
});