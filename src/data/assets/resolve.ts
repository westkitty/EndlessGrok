import { ICONS, type IconName } from '../../components/icons/iconHelpers';
import { resolveAssetId } from './assetIdReconciliation';
import { publicAssetPathToUrl } from './paths';
import { getAssetById, getAssetByMechanicalKey } from './registry';
import { getManifestBackedTooltip, getManifestRecordForKey, getManifestTestId } from './runtimeResolve';
import type { AssetRecord, AssetTooltipSpec, RuntimeTooltipContext } from './types';

const DEFAULT_FALLBACK_ICON: IconName = 'anomaly';
const warnedMissing = new Set<string>();

function warnMissingOnce(key: string, detail: string): void {
  if (typeof import.meta !== 'undefined' && !import.meta.env?.DEV) return;
  if (warnedMissing.has(key)) return;
  warnedMissing.add(key);
  console.warn(`[assets] ${detail}`);
}

export function resetAssetWarnings(): void {
  warnedMissing.clear();
}

export function resolveAssetRecord(assetOrKey: string | AssetRecord): AssetRecord | undefined {
  if (typeof assetOrKey === 'string') {
    const canonical = resolveAssetId(assetOrKey);
    return (
      getAssetByMechanicalKey(assetOrKey)
      ?? getAssetById(canonical)
      ?? getAssetById(assetOrKey)
    );
  }
  return assetOrKey;
}

export function getAssetIconName(assetOrKey: string | AssetRecord): IconName {
  const record = resolveAssetRecord(assetOrKey);
  if (!record) {
    warnMissingOnce(`missing:${assetOrKey}`, `No asset record for ${assetOrKey}`);
    return getAssetFallbackIcon(typeof assetOrKey === 'string' ? assetOrKey : assetOrKey.mechanicalKey);
  }
  if (record.iconName && record.iconName in ICONS) return record.iconName;
  if (record.fallbackIconName && record.fallbackIconName in ICONS) return record.fallbackIconName;
  return DEFAULT_FALLBACK_ICON;
}

export function hasGeneratedAssetRecord(record: AssetRecord): boolean {
  if (record.status !== 'generated' && record.status !== 'integrated') return false;
  const svgPath = record.plannedFiles?.svg;
  return Boolean(svgPath?.startsWith('public/assets/icons/'));
}

export function getAssetSvgUrl(assetOrKey: string | AssetRecord): string | null {
  const record = resolveAssetRecord(assetOrKey);
  if (!record?.plannedFiles?.svg) return null;
  if (!hasGeneratedAssetRecord(record)) return null;
  return publicAssetPathToUrl(record.plannedFiles.svg);
}

export function getAssetIconSrc(assetOrKey: string | AssetRecord): string {
  const svgUrl = getAssetSvgUrl(assetOrKey);
  if (svgUrl) return svgUrl;
  return ICONS[getAssetIconName(assetOrKey)];
}

export function getAssetFallbackIcon(mechanicalKeyOrType: string): IconName {
  const record = getAssetByMechanicalKey(mechanicalKeyOrType);
  if (record?.fallbackIconName && record.fallbackIconName in ICONS) return record.fallbackIconName;
  if (record?.iconName && record.iconName in ICONS) return record.iconName;

  if (mechanicalKeyOrType.startsWith('resource:')) return 'research';
  if (mechanicalKeyOrType.startsWith('victory:')) return 'research';
  if (mechanicalKeyOrType.startsWith('macro-effect:')) return 'anomaly';
  if (mechanicalKeyOrType.startsWith('macro:')) return 'anomaly';
  if (mechanicalKeyOrType.startsWith('map:')) return 'anomaly';
  if (mechanicalKeyOrType.startsWith('faction:')) return 'emblem-terran';
  if (mechanicalKeyOrType.startsWith('fleet:')) return 'fleet';
  if (mechanicalKeyOrType.startsWith('ship:')) return 'scout';
  return DEFAULT_FALLBACK_ICON;
}

export function getAssetTestId(assetOrKey: string | AssetRecord): string {
  const record = resolveAssetRecord(assetOrKey);
  if (record) return record.testId;
  if (typeof assetOrKey === 'string') {
    const manifestTestId = getManifestTestId(assetOrKey);
    if (manifestTestId) return manifestTestId;
  }
  const safe = typeof assetOrKey === 'string'
    ? assetOrKey.replace(/[^a-zA-Z0-9_-]/g, '-')
    : 'asset-unknown';
  return `asset-fallback-${safe}`;
}

export function getAssetTooltip(assetOrKey: string | AssetRecord): AssetTooltipSpec | null {
  const record = resolveAssetRecord(assetOrKey);
  if (record?.tooltip) return record.tooltip;
  if (typeof assetOrKey === 'string') {
    return getManifestBackedTooltip(assetOrKey);
  }
  return null;
}

export function getAssetDisplayName(assetOrKey: string | AssetRecord): string {
  const record = resolveAssetRecord(assetOrKey);
  return record?.displayName ?? (typeof assetOrKey === 'string' ? assetOrKey : 'Unknown asset');
}

export function getAssetVisualVariant(assetOrKey: string | AssetRecord): string {
  const record = resolveAssetRecord(assetOrKey);
  return record?.visualVariant ?? 'default';
}

export function getAssetAccessibilityLabel(assetOrKey: string | AssetRecord): string {
  const record = resolveAssetRecord(assetOrKey);
  return record?.accessibilityLabel ?? getAssetDisplayName(assetOrKey);
}

export function getFleetRoleMechanicalKey(role: string): string {
  return `fleet:${role}`;
}

export function getFleetStanceMechanicalKey(stance: string): string {
  return stance === 'aggressive' ? 'fleet:stance-aggressive' : 'fleet:stance-passive';
}

export function getFactionEmblemMechanicalKey(emblem: string): string {
  return `faction:emblem-${emblem}`;
}

export function getMacroMechanicalKey(macroId: string): string {
  return `macro:${macroId}`;
}

export function buildRuntimeTooltip(
  assetOrKey: string | AssetRecord,
  runtime: RuntimeTooltipContext = {},
): AssetTooltipSpec & RuntimeTooltipContext {
  const base = getAssetTooltip(assetOrKey);
  const record = resolveAssetRecord(assetOrKey);
  const manifestRecord = typeof assetOrKey === 'string'
    ? getManifestRecordForKey(assetOrKey)
    : undefined;
  return {
    title: base?.title ?? record?.displayName ?? manifestRecord?.displayName ?? 'Unknown',
    mechanical: base?.mechanical ?? record?.mechanicalMeaning ?? manifestRecord?.tooltip.mechanical ?? '',
    lore: base?.lore ?? record?.loreMeaning ?? manifestRecord?.tooltip.lore ?? '',
    warning: base?.warning ?? manifestRecord?.tooltip.warning,
    requirements: base?.requirements,
    costs: runtime.costs ?? base?.costs,
    effects: runtime.effects ?? base?.effects,
    stateLabel: runtime.statusLabel ?? base?.stateLabel,
    canonLabel: base?.canonLabel,
    ...runtime,
  };
}