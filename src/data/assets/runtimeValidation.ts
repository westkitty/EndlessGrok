import type { AssetFamily } from './types';
import { isValidSourceBasis, KEBAB_CASE_PATTERN, KEBAB_FILENAME_PATTERN } from './runtimeEnrich';
import type { RuntimeValidationIssue, StarsilkAssetRecord, StarsilkAssetStatus } from './runtimeTypes';

const VALID_STATUSES = new Set<StarsilkAssetStatus>([
  'planned',
  'prompted',
  'generated-unverified',
  'generated-verified',
  'implemented',
  'needs-revision',
  'deferred',
]);

const VALID_FAMILIES = new Set<AssetFamily>([
  'resources', 'victory', 'map', 'macros', 'factions', 'fleets', 'planets', 'ui', 'audio', 'events',
]);

const FILE_CLAIMING_STATUSES = new Set<StarsilkAssetStatus>([
  'generated-unverified',
  'generated-verified',
  'implemented',
]);

export function validateRuntimeRecord(
  record: StarsilkAssetRecord,
  options: { fileExists?: (path: string) => boolean } = {},
): RuntimeValidationIssue[] {
  const issues: RuntimeValidationIssue[] = [];
  const fileExists = options.fileExists ?? (() => false);

  if (!record.id) {
    issues.push({ assetId: '(missing)', field: 'id', message: 'id is required', severity: 'error' });
    return issues;
  }

  if (!KEBAB_CASE_PATTERN.test(record.id)) {
    issues.push({ assetId: record.id, field: 'id', message: 'Asset ID must be kebab-case', severity: 'error' });
  }

  if (!VALID_FAMILIES.has(record.family)) {
    issues.push({ assetId: record.id, field: 'family', message: `Invalid family: ${record.family}`, severity: 'error' });
  }

  if (!VALID_STATUSES.has(record.status)) {
    issues.push({ assetId: record.id, field: 'status', message: `Invalid status: ${record.status}`, severity: 'error' });
  }

  if (!isValidSourceBasis(record.sourceBasis)) {
    issues.push({ assetId: record.id, field: 'sourceBasis', message: `Invalid source basis: ${record.sourceBasis}`, severity: 'error' });
  }

  if (!record.accessibilityLabel?.trim()) {
    issues.push({ assetId: record.id, field: 'accessibilityLabel', message: 'Accessibility label is required', severity: 'error' });
  }

  if (!record.testId) {
    issues.push({ assetId: record.id, field: 'testId', message: 'testId is required', severity: 'error' });
  }

  if (record.filename && !KEBAB_FILENAME_PATTERN.test(record.filename)) {
    issues.push({ assetId: record.id, field: 'filename', message: `Filename must be kebab-case: ${record.filename}`, severity: 'error' });
  }

  if (!record.tooltip?.mechanical || !record.tooltip?.lore) {
    issues.push({ assetId: record.id, field: 'tooltip', message: 'Tooltip requires mechanical and lore', severity: 'error' });
  }

  if (FILE_CLAIMING_STATUSES.has(record.status) && record.plannedPath && !fileExists(record.plannedPath)) {
    issues.push({
      assetId: record.id,
      field: 'status',
      message: `Status ${record.status} claims missing file: ${record.plannedPath}`,
      severity: 'error',
    });
  }

  return issues;
}

export function validateRuntimeManifest(
  records: StarsilkAssetRecord[],
  options: { fileExists?: (path: string) => boolean } = {},
): RuntimeValidationIssue[] {
  const issues: RuntimeValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenTestIds = new Set<string>();

  for (const record of records) {
    issues.push(...validateRuntimeRecord(record, options));

    if (seenIds.has(record.id)) {
      issues.push({ assetId: record.id, field: 'id', message: 'Duplicate asset id', severity: 'error' });
    }
    seenIds.add(record.id);

    if (seenTestIds.has(record.testId)) {
      issues.push({ assetId: record.id, field: 'testId', message: `Duplicate testId: ${record.testId}`, severity: 'error' });
    }
    seenTestIds.add(record.testId);
  }

  return issues;
}

export function getRuntimeValidationErrors(issues: RuntimeValidationIssue[]): RuntimeValidationIssue[] {
  return issues.filter(issue => issue.severity === 'error');
}