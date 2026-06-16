import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  parseRegistryDocRows,
  validateLedgerManifest,
  validateRegistryManifestAlignment,
  getLedgerValidationErrors,
  getLedgerFilename,
  normalizeLedgerManifest,
} from '../ledger';
import { loadLedgerManifest } from '../ledgerLoad';
import { ASSETS_MANIFEST, getLedgerAssetById } from '../assetsManifest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const manifestPath = resolve(repoRoot, 'src/data/assets/assets.manifest.json');
const registryDocPath = resolve(repoRoot, 'docs/asset-registry.md');

function repoFileExists(relativePath: string): boolean {
  return existsSync(resolve(repoRoot, relativePath));
}

describe('ledger manifest', () => {
  it('loads 134 ledger records from assets.manifest.json', () => {
    const records = loadLedgerManifest(manifestPath);
    expect(records).toHaveLength(134);
    expect(records.filter(r => r.status === 'prompted')).toHaveLength(115);
    expect(records.filter(r => r.status === 'generated-unverified')).toHaveLength(19);
  });

  it('exports manifest for app import', () => {
    expect(ASSETS_MANIFEST).toHaveLength(134);
    expect(getLedgerAssetById('resource-starsilk-thread')?.family).toBe('resources');
  });

  it('parses registry doc rows from asset-registry.md', () => {
    const markdown = readFileSync(registryDocPath, 'utf8');
    const rows = parseRegistryDocRows(markdown);
    expect(rows).toHaveLength(134);
    expect(rows[0].assetId).toBe('audio-ui-confirm');
  });

  it('validates manifest schema when generated batch files exist', () => {
    const records = loadLedgerManifest(manifestPath);
    const errors = getLedgerValidationErrors(
      validateLedgerManifest(records, { fileExists: repoFileExists }),
    );
    expect(errors).toEqual([]);
  });

  it('keeps registry and manifest aligned', () => {
    const records = loadLedgerManifest(manifestPath);
    const rows = parseRegistryDocRows(readFileSync(registryDocPath, 'utf8'));
    const errors = getLedgerValidationErrors(validateRegistryManifestAlignment(records, rows));
    expect(errors).toEqual([]);
  });

  it('rejects generated status when file is missing', () => {
    const records = normalizeLedgerManifest([
      {
        id: 'resource-starsilk-thread',
        displayName: 'Resource Starsilk Thread',
        family: 'resources',
        plannedFiles: { svg: 'public/assets/icons/resources/resource-starsilk-thread.svg' },
        states: ['default'],
        mechanicalMeaning: 'test',
        loreMeaning: 'test',
        accessibilityLabel: 'test',
        tooltip: null,
        testId: 'resource-starsilk-thread',
        sourceBasis: 'direct canon',
        status: 'generated-verified',
      },
    ]);

    const errors = getLedgerValidationErrors(
      validateLedgerManifest(records, { fileExists: () => false }),
    );
    expect(errors.some(error => error.message.includes('does not exist'))).toBe(true);
  });

  it('derives filenames from planned file paths', () => {
    expect(
      getLedgerFilename({ svg: 'public/assets/icons/resources/resource-starsilk-thread.svg' }),
    ).toBe('resource-starsilk-thread.svg');
    expect(getLedgerFilename({ md: 'docs/asset-registry.md' })).toBe('asset-registry.md');
  });

  it('allows prompted records without existing files on disk', () => {
    const records = loadLedgerManifest(manifestPath);
    const missingPrompted = records.filter(record => {
      const path = record.plannedFiles.svg ?? record.plannedFiles.ogg ?? record.plannedFiles.json ?? record.plannedFiles.md;
      return path ? !repoFileExists(path) : false;
    });
    expect(missingPrompted.length).toBeGreaterThan(0);
    const errors = getLedgerValidationErrors(validateLedgerManifest(records, { fileExists: repoFileExists }));
    expect(errors).toEqual([]);
  });
});