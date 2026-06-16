import type { IconName } from '../../components/icons/iconHelpers';
import { isKnownAssetFamily, isSafeAssetPath } from './paths';
import type { AssetFamily, AssetRecord, AssetStatus, AssetTooltipSpec, AssetVisualVariant, CanonLabel } from './types';

export interface AssetManifestTooltip {
  title: string;
  mechanical: string;
  lore: string;
  warning?: string;
  requirements?: string[];
  costs?: string[];
  effects?: string[];
  canonLabel?: CanonLabel;
  stateLabel?: string;
}

export interface AssetManifestEntry {
  assetId: string;
  mechanicalKey: string;
  family: AssetFamily;
  type?: string;
  displayName: string;
  filename: string;
  relativePath: string;
  status: AssetStatus;
  testId: string;
  tooltip: AssetManifestTooltip;
  states?: string[];
  sourceLabel?: string;
  implementationNotes?: string;
  qaChecks?: string[];
  iconName?: IconName;
  fallbackIconName?: IconName;
  visualVariant?: AssetVisualVariant;
}

export interface AssetManifest {
  batchId: string;
  batchName: string;
  sourceAgent: string;
  createdAt: string;
  canonSafetyVersion: string;
  assets: AssetManifestEntry[];
}

export interface ManifestValidationIssue {
  assetId: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

const PROHIBITED_PATTERNS = [
  /\bspider\b/i,
  /\bspiderweb\b/i,
  /\bweb\s*imagery\b/i,
  /\bendless\s*space\b/i,
  /\bendlessspace\b/i,
];

const MECHANICAL_KEY_PATTERN = /^[a-z][a-z0-9]*:[a-zA-Z0-9_.-]+$/;

export function normalizeManifestMechanicalKey(key: string): string {
  return key.trim();
}

export function containsProhibitedLanguage(text: string): string | null {
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(text)) {
      return `Prohibited term matched: ${pattern.source}`;
    }
  }
  return null;
}

export function validateManifestAssetEntry(
  entry: AssetManifestEntry,
  options: { fileExists?: (relativePath: string) => boolean } = {},
): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];
  const fileExists = options.fileExists ?? (() => false);

  if (!entry.assetId) {
    issues.push({ assetId: '(missing)', field: 'assetId', message: 'assetId is required', severity: 'error' });
  }

  const mechanicalKey = normalizeManifestMechanicalKey(entry.mechanicalKey ?? '');
  if (!mechanicalKey) {
    issues.push({ assetId: entry.assetId, field: 'mechanicalKey', message: 'mechanicalKey is required', severity: 'error' });
  } else if (!MECHANICAL_KEY_PATTERN.test(mechanicalKey)) {
    issues.push({ assetId: entry.assetId, field: 'mechanicalKey', message: `Invalid mechanicalKey format: ${mechanicalKey}`, severity: 'error' });
  }

  if (!isKnownAssetFamily(entry.family)) {
    issues.push({ assetId: entry.assetId, field: 'family', message: `Unsupported family: ${entry.family}`, severity: 'error' });
  }

  if (!entry.testId) {
    issues.push({ assetId: entry.assetId, field: 'testId', message: 'testId is required', severity: 'error' });
  }

  if (!entry.tooltip?.mechanical) {
    issues.push({ assetId: entry.assetId, field: 'tooltip.mechanical', message: 'Tooltip mechanical summary is required', severity: 'error' });
  }
  if (!entry.tooltip?.title) {
    issues.push({ assetId: entry.assetId, field: 'tooltip.title', message: 'Tooltip title is required', severity: 'error' });
  }

  if (!entry.relativePath) {
    issues.push({ assetId: entry.assetId, field: 'relativePath', message: 'relativePath is required', severity: 'error' });
  } else if (!isSafeAssetPath(entry.relativePath)) {
    issues.push({ assetId: entry.assetId, field: 'relativePath', message: `Unsafe asset path: ${entry.relativePath}`, severity: 'error' });
  }

  if (entry.status === 'integrated') {
    if (!entry.filename) {
      issues.push({ assetId: entry.assetId, field: 'filename', message: 'integrated assets require filename', severity: 'error' });
    }
    if (entry.relativePath && !fileExists(entry.relativePath)) {
      issues.push({ assetId: entry.assetId, field: 'relativePath', message: `integrated asset file missing: ${entry.relativePath}`, severity: 'error' });
    }
    if (!entry.iconName && !entry.fallbackIconName) {
      issues.push({ assetId: entry.assetId, message: 'integrated assets need iconName or fallbackIconName for UI resolution', severity: 'warning' });
    }
  }

  const textBlob = [
    entry.displayName,
    entry.tooltip?.title,
    entry.tooltip?.mechanical,
    entry.tooltip?.lore,
    entry.tooltip?.warning,
    entry.implementationNotes,
    ...(entry.qaChecks ?? []),
  ].filter(Boolean).join(' ');

  const prohibited = containsProhibitedLanguage(textBlob);
  if (prohibited) {
    issues.push({ assetId: entry.assetId, message: prohibited, severity: 'error' });
  }

  return issues;
}

export function validateAssetManifest(
  manifest: AssetManifest,
  options: { fileExists?: (relativePath: string) => boolean; allowDuplicateMechanicalKeys?: boolean } = {},
): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];

  if (!manifest.batchId) issues.push({ assetId: '(manifest)', field: 'batchId', message: 'batchId is required', severity: 'error' });
  if (!manifest.batchName) issues.push({ assetId: '(manifest)', field: 'batchName', message: 'batchName is required', severity: 'error' });
  if (!manifest.sourceAgent) issues.push({ assetId: '(manifest)', field: 'sourceAgent', message: 'sourceAgent is required', severity: 'error' });
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    issues.push({ assetId: '(manifest)', field: 'assets', message: 'assets array must not be empty', severity: 'error' });
    return issues;
  }

  const seenKeys = new Map<string, string>();
  for (const entry of manifest.assets) {
    issues.push(...validateManifestAssetEntry(entry, options));

    const key = normalizeManifestMechanicalKey(entry.mechanicalKey);
    if (key) {
      const prev = seenKeys.get(key);
      if (prev && !options.allowDuplicateMechanicalKeys) {
        issues.push({
          assetId: entry.assetId,
          field: 'mechanicalKey',
          message: `Duplicate mechanicalKey ${key} (also used by ${prev})`,
          severity: 'error',
        });
      } else {
        seenKeys.set(key, entry.assetId);
      }
    }
  }

  return issues;
}

export function getManifestValidationErrors(issues: ManifestValidationIssue[]): ManifestValidationIssue[] {
  return issues.filter(i => i.severity === 'error');
}

export function manifestAssetToAssetRecord(entry: AssetManifestEntry): AssetRecord {
  const tooltip: AssetTooltipSpec = {
    title: entry.tooltip.title,
    mechanical: entry.tooltip.mechanical,
    lore: entry.tooltip.lore,
    warning: entry.tooltip.warning,
    requirements: entry.tooltip.requirements,
    costs: entry.tooltip.costs,
    effects: entry.tooltip.effects,
    canonLabel: entry.tooltip.canonLabel,
    stateLabel: entry.tooltip.stateLabel,
  };

  return {
    id: entry.assetId,
    mechanicalKey: normalizeManifestMechanicalKey(entry.mechanicalKey),
    displayName: entry.displayName,
    family: entry.family,
    states: entry.states ?? ['default'],
    mechanicalMeaning: entry.tooltip.mechanical,
    loreMeaning: entry.tooltip.lore,
    accessibilityLabel: entry.displayName,
    tooltip,
    testId: entry.testId,
    sourceBasis: entry.sourceLabel ?? 'asset manifest batch',
    status: entry.status,
    iconName: entry.iconName,
    fallbackIconName: entry.fallbackIconName,
    visualVariant: entry.visualVariant,
    plannedFiles: { svg: entry.relativePath },
  };
}

export function manifestToAssetRecords(manifest: AssetManifest): AssetRecord[] {
  return manifest.assets.map(manifestAssetToAssetRecord);
}