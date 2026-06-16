import type { AssetFamily } from './types';

export type LedgerAssetStatus =
  | 'planned'
  | 'prompted'
  | 'generated-unverified'
  | 'generated-verified'
  | 'implemented'
  | 'needs-revision'
  | 'deferred';

export interface LedgerPlannedFiles {
  svg?: string;
  png24?: string;
  png32?: string;
  png64?: string;
  md?: string;
  json?: string;
  ogg?: string;
}

export interface LedgerAssetRecord {
  id: string;
  displayName: string;
  family: AssetFamily;
  plannedFiles: LedgerPlannedFiles;
  states: string[];
  mechanicalMeaning: string;
  loreMeaning: string;
  accessibilityLabel: string;
  tooltip: null;
  testId: string;
  sourceBasis: string;
  status: LedgerAssetStatus;
}

export interface RegistryDocRow {
  assetId: string;
  filename: string;
  family: AssetFamily;
  status: LedgerAssetStatus;
  sourceBasis: string;
  codeReference: string;
  testId: string;
}

export interface LedgerValidationIssue {
  assetId: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

const LEDGER_STATUSES = new Set<LedgerAssetStatus>([
  'planned',
  'prompted',
  'generated-unverified',
  'generated-verified',
  'implemented',
  'needs-revision',
  'deferred',
]);

const FILE_CLAIMING_STATUSES = new Set<LedgerAssetStatus>([
  'generated-unverified',
  'generated-verified',
  'implemented',
]);

const VALID_FAMILIES = new Set<AssetFamily>([
  'resources',
  'victory',
  'map',
  'macros',
  'factions',
  'fleets',
  'planets',
  'ui',
  'audio',
  'events',
]);

export function getLedgerPrimaryPath(plannedFiles: LedgerPlannedFiles): string | undefined {
  return (
    plannedFiles.svg
    ?? plannedFiles.ogg
    ?? plannedFiles.json
    ?? plannedFiles.md
    ?? plannedFiles.png24
    ?? plannedFiles.png32
    ?? plannedFiles.png64
  );
}

export function getLedgerFilename(plannedFiles: LedgerPlannedFiles): string {
  const path = getLedgerPrimaryPath(plannedFiles);
  if (!path) return '';
  const segments = path.replace(/\\/g, '/').split('/');
  return segments[segments.length - 1] ?? '';
}

export function normalizeLedgerManifest(raw: unknown): LedgerAssetRecord[] {
  if (!Array.isArray(raw)) {
    throw new Error('assets.manifest.json must be a top-level array');
  }
  return raw as LedgerAssetRecord[];
}

export function validateLedgerManifest(
  records: LedgerAssetRecord[],
  options: { fileExists?: (relativePath: string) => boolean } = {},
): LedgerValidationIssue[] {
  const issues: LedgerValidationIssue[] = [];
  const fileExists = options.fileExists ?? (() => false);
  const seenIds = new Set<string>();

  for (const record of records) {
    if (!record.id) {
      issues.push({ assetId: '(missing)', field: 'id', message: 'id is required', severity: 'error' });
      continue;
    }

    if (seenIds.has(record.id)) {
      issues.push({ assetId: record.id, field: 'id', message: 'Duplicate asset id', severity: 'error' });
    }
    seenIds.add(record.id);

    if (!VALID_FAMILIES.has(record.family)) {
      issues.push({ assetId: record.id, field: 'family', message: `Invalid family: ${record.family}`, severity: 'error' });
    }

    if (!LEDGER_STATUSES.has(record.status)) {
      issues.push({ assetId: record.id, field: 'status', message: `Invalid status: ${record.status}`, severity: 'error' });
    }

    if (!record.testId) {
      issues.push({ assetId: record.id, field: 'testId', message: 'testId is required', severity: 'error' });
    } else if (record.testId !== record.id) {
      issues.push({
        assetId: record.id,
        field: 'testId',
        message: `testId must match asset id (${record.id})`,
        severity: 'warning',
      });
    }

    if (!record.sourceBasis) {
      issues.push({ assetId: record.id, field: 'sourceBasis', message: 'sourceBasis is required', severity: 'error' });
    }

    const primaryPath = getLedgerPrimaryPath(record.plannedFiles ?? {});
    if (!primaryPath) {
      issues.push({ assetId: record.id, field: 'plannedFiles', message: 'plannedFiles requires at least one path', severity: 'error' });
    }

    if (FILE_CLAIMING_STATUSES.has(record.status)) {
      if (!primaryPath) {
        issues.push({
          assetId: record.id,
          field: 'status',
          message: `Status ${record.status} requires a planned file path`,
          severity: 'error',
        });
      } else if (!fileExists(primaryPath)) {
        issues.push({
          assetId: record.id,
          field: 'status',
          message: `Status ${record.status} claims file that does not exist: ${primaryPath}`,
          severity: 'error',
        });
      }
    }
  }

  return issues;
}

export function parseRegistryDocRows(markdown: string): RegistryDocRow[] {
  const rows: RegistryDocRow[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.startsWith('|---')) continue;

    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim());

    if (cells.length < 10) continue;
    if (cells[0] === 'Asset ID') continue;

    const [assetId, filename, family, , status, sourceBasis, , codeReference, testId] = cells;
    if (!assetId || !VALID_FAMILIES.has(family as AssetFamily)) continue;
    if (!LEDGER_STATUSES.has(status as LedgerAssetStatus)) continue;

    rows.push({
      assetId,
      filename,
      family: family as AssetFamily,
      status: status as LedgerAssetStatus,
      sourceBasis,
      codeReference,
      testId,
    });
  }

  return rows;
}

export function validateRegistryManifestAlignment(
  records: LedgerAssetRecord[],
  registryRows: RegistryDocRow[],
): LedgerValidationIssue[] {
  const issues: LedgerValidationIssue[] = [];
  const byId = new Map(records.map(record => [record.id, record]));
  const rowIds = new Set(registryRows.map(row => row.assetId));

  for (const row of registryRows) {
    const record = byId.get(row.assetId);
    if (!record) {
      issues.push({
        assetId: row.assetId,
        message: `Registry row missing from assets.manifest.json`,
        severity: 'error',
      });
      continue;
    }

    const filename = getLedgerFilename(record.plannedFiles ?? {});
    const primaryPath = getLedgerPrimaryPath(record.plannedFiles ?? {});

    if (filename !== row.filename) {
      issues.push({
        assetId: row.assetId,
        field: 'filename',
        message: `Filename mismatch: manifest=${filename} registry=${row.filename}`,
        severity: 'error',
      });
    }

    if (record.family !== row.family) {
      issues.push({
        assetId: row.assetId,
        field: 'family',
        message: `Family mismatch: manifest=${record.family} registry=${row.family}`,
        severity: 'error',
      });
    }

    if (record.status !== row.status) {
      issues.push({
        assetId: row.assetId,
        field: 'status',
        message: `Status mismatch: manifest=${record.status} registry=${row.status}`,
        severity: 'error',
      });
    }

    if (record.sourceBasis !== row.sourceBasis) {
      issues.push({
        assetId: row.assetId,
        field: 'sourceBasis',
        message: `Source basis mismatch: manifest=${record.sourceBasis} registry=${row.sourceBasis}`,
        severity: 'error',
      });
    }

    if (record.testId !== row.testId) {
      issues.push({
        assetId: row.assetId,
        field: 'testId',
        message: `Test ID mismatch: manifest=${record.testId} registry=${row.testId}`,
        severity: 'error',
      });
    }

    if (primaryPath && primaryPath !== row.codeReference) {
      issues.push({
        assetId: row.assetId,
        field: 'plannedFiles',
        message: `Planned path mismatch: manifest=${primaryPath} registry=${row.codeReference}`,
        severity: 'error',
      });
    }
  }

  for (const record of records) {
    if (!rowIds.has(record.id)) {
      issues.push({
        assetId: record.id,
        message: 'Manifest entry missing from docs/asset-registry.md',
        severity: 'error',
      });
    }
  }

  return issues;
}

export function getLedgerValidationErrors(issues: LedgerValidationIssue[]): LedgerValidationIssue[] {
  return issues.filter(issue => issue.severity === 'error');
}