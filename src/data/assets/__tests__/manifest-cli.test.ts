import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { runValidateManifest, runPreviewManifest } from '../cli';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../__fixtures__/manifests');
const repoRoot = resolve(fixturesDir, '../../../../..');

describe('manifest CLI scripts', () => {
  it('validate exits 0 on planned fixture', () => {
    expect(runValidateManifest(resolve(fixturesDir, 'planned-batch.json'), repoRoot)).toBe(0);
  });

  it('validate exits nonzero on invalid fixture', () => {
    expect(runValidateManifest(resolve(fixturesDir, 'invalid-missing-key.json'), repoRoot)).not.toBe(0);
  });

  it('preview exits 0 on valid planned fixture', async () => {
    await expect(runPreviewManifest(resolve(fixturesDir, 'planned-batch.json'), repoRoot)).resolves.toBe(0);
  });
});