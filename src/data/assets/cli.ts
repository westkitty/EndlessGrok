import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  validateAssetManifest,
  getManifestValidationErrors,
  type AssetManifest,
} from './manifest';

export function createRepoFileExists(repoRoot: string): (relativePath: string) => boolean {
  return (relativePath: string) => existsSync(resolve(repoRoot, relativePath));
}

export function loadManifestFile(manifestPath: string): AssetManifest {
  const raw = readFileSync(resolve(manifestPath), 'utf8');
  return JSON.parse(raw) as AssetManifest;
}

export function runValidateManifest(manifestPath: string, repoRoot: string): number {
  let manifest: AssetManifest;
  try {
    manifest = loadManifestFile(manifestPath);
  } catch (err) {
    console.error(`Cannot read manifest: ${(err as Error).message}`);
    return 1;
  }

  const fileExists = createRepoFileExists(repoRoot);
  const issues = validateAssetManifest(manifest, { fileExists });
  const errors = getManifestValidationErrors(issues);
  const warnings = issues.filter(i => i.severity === 'warning');

  if (errors.length > 0) {
    console.error(`Manifest validation FAILED: ${manifest.batchId ?? '(unknown)'}`);
    for (const err of errors) {
      console.error(`  [error] ${err.assetId}${err.field ? `.${err.field}` : ''}: ${err.message}`);
    }
    for (const warn of warnings) {
      console.warn(`  [warn] ${warn.assetId}: ${warn.message}`);
    }
    return 1;
  }

  console.log(`Manifest validation PASSED: ${manifest.batchName} (${manifest.batchId})`);
  console.log(`  assets: ${manifest.assets.length}`);
  console.log(`  agent: ${manifest.sourceAgent}`);
  for (const warn of warnings) {
    console.warn(`  [warn] ${warn.assetId}: ${warn.message}`);
  }
  return 0;
}

export async function runPreviewManifest(manifestPath: string, repoRoot: string): Promise<number> {
  let manifest: AssetManifest;
  try {
    manifest = loadManifestFile(manifestPath);
  } catch (err) {
    console.error(`Cannot load manifest: ${(err as Error).message}`);
    return 1;
  }

  const fileExists = createRepoFileExists(repoRoot);
  const errors = getManifestValidationErrors(validateAssetManifest(manifest, { fileExists }));
  if (errors.length > 0) {
    console.error('Manifest has validation errors — fix before preview:');
    for (const err of errors) {
      console.error(`  ${err.assetId}: ${err.message}`);
    }
    return 1;
  }

  const { getRegistryPatchPreview } = await import('./integration');
  const preview = getRegistryPatchPreview(manifest, { fileExists });

  console.log(`Registry patch preview: ${preview.batchName} (${preview.batchId})`);
  console.log(`  add: ${preview.toAdd.length}`);
  console.log(`  update: ${preview.toUpdate.length}`);
  console.log(`  unchanged: ${preview.unchanged.length}`);
  console.log(`  conflicts: ${preview.conflicts.length}`);
  console.log(`  missing integrated files: ${preview.missingFiles.length}`);

  if (preview.toAdd.length > 0) {
    console.log('\nRecords to ADD:');
    for (const r of preview.toAdd) {
      console.log(`  + ${r.mechanicalKey} (${r.id}) status=${r.status}`);
    }
  }

  if (preview.toUpdate.length > 0) {
    console.log('\nRecords to UPDATE:');
    for (const u of preview.toUpdate) {
      console.log(`  ~ ${u.after.mechanicalKey}: status ${u.before.status} → ${u.after.status}`);
    }
  }

  if (preview.conflicts.length > 0) {
    console.log('\nCONFLICTS:');
    for (const c of preview.conflicts) {
      console.log(`  ! ${c.mechanicalKey}: ${c.message}`);
    }
  }

  if (preview.missingFiles.length > 0) {
    console.log('\nMissing files (integrated):');
    for (const p of preview.missingFiles) {
      console.log(`  - ${p}`);
    }
  }

  if (preview.suggestedDocRows.length > 0) {
    console.log('\nSuggested docs/asset-registry.md rows:');
    for (const row of preview.suggestedDocRows) {
      console.log(row);
    }
  }

  console.log('\nDry-run only — registry files were not modified.');
  return preview.conflicts.length > 0 ? 2 : 0;
}