import type { AssetFamily, AssetRecord } from './types';

export const CANONICAL_ASSET_ICON_ROOT = 'src/assets/icons';

export const CANONICAL_FAMILY_DIRS: Record<AssetFamily, string> = {
  resources: `${CANONICAL_ASSET_ICON_ROOT}/resources`,
  victory: `${CANONICAL_ASSET_ICON_ROOT}/victory`,
  macros: `${CANONICAL_ASSET_ICON_ROOT}/macros`,
  map: `${CANONICAL_ASSET_ICON_ROOT}/map`,
  factions: `${CANONICAL_ASSET_ICON_ROOT}/factions`,
  fleets: `${CANONICAL_ASSET_ICON_ROOT}/fleets`,
  planets: `${CANONICAL_ASSET_ICON_ROOT}/planets`,
  ui: `${CANONICAL_ASSET_ICON_ROOT}/ui`,
  audio: `${CANONICAL_ASSET_ICON_ROOT}/audio`,
  events: `${CANONICAL_ASSET_ICON_ROOT}/events`,
};

/** Modules use fleets dir until a dedicated modules folder is populated */
export const MODULE_ASSET_DIR = `${CANONICAL_ASSET_ICON_ROOT}/modules`;

const KNOWN_FAMILIES = new Set<AssetFamily>(Object.keys(CANONICAL_FAMILY_DIRS) as AssetFamily[]);

const UNSAFE_SEGMENTS = ['..', 'node_modules', '.env', '.git'];

export function isKnownAssetFamily(family: string): family is AssetFamily {
  return KNOWN_FAMILIES.has(family as AssetFamily);
}

export function isSafeAssetPath(relativePath: string): boolean {
  if (!relativePath || typeof relativePath !== 'string') return false;
  if (relativePath.startsWith('/') || relativePath.startsWith('\\')) return false;
  if (/^[a-zA-Z]:/.test(relativePath)) return false;
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.includes('://')) return false;
  for (const segment of UNSAFE_SEGMENTS) {
    if (normalized.split('/').includes(segment)) return false;
  }
  if (!normalized.startsWith('src/assets/icons/')) return false;
  if (!normalized.endsWith('.svg') && !normalized.endsWith('.png')) return false;
  return true;
}

export function getCanonicalAssetPath(
  family: AssetFamily,
  filename: string,
): string {
  const dir = CANONICAL_FAMILY_DIRS[family];
  const safeName = filename.replace(/[/\\]/g, '');
  return `${dir}/${safeName}`;
}

export function getCanonicalAssetPathForRecord(record: Pick<AssetRecord, 'family' | 'id'> & { filename?: string }): string {
  const filename = record.filename ?? `${record.id}.svg`;
  return getCanonicalAssetPath(record.family, filename);
}

export function resolveManifestAssetPath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}