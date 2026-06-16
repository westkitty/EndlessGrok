import { getHazardProtectionLevel } from '../../game/hazards';
import { isCollapsedSystem } from '../../game/heliocide';
import { getAssetByMechanicalKey } from './registry';
import { getAssetTestId } from './resolve';
import type { GameState, StarSystem } from '../../game/types';

export interface MapStateBadge {
  mechanicalKey: string;
  label: string;
  priority: number;
  color: string;
  testId: string;
  variant: string;
}

const BADGE_COLORS: Record<string, string> = {
  catastrophic: 'var(--danger)',
  hazard: 'var(--warning)',
  inerting: 'var(--accent-cyan)',
  seal: 'var(--accent-violet)',
  default: 'var(--text-dim)',
};

export function getSystemMapStateBadges(
  system: StarSystem,
  state: GameState,
  playerId: string,
): MapStateBadge[] {
  const badges: MapStateBadge[] = [];

  const push = (mechanicalKey: string, label: string, priority: number, variant = 'default') => {
    const asset = getAssetByMechanicalKey(mechanicalKey);
    badges.push({
      mechanicalKey,
      label: asset?.displayName ?? label,
      priority,
      color: BADGE_COLORS[asset?.visualVariant ?? variant] ?? BADGE_COLORS.default,
      testId: getAssetTestId(mechanicalKey),
      variant: asset?.visualVariant ?? variant,
    });
  };

  if (isCollapsedSystem(system) || system.systemType === 'black_hole') {
    push('map:collapsed_black_hole', 'Collapsed singularity', 90, 'hazard');
  } else if (system.starState === 'collapsing') {
    push('map:collapsing', 'Collapsing', 95, 'catastrophic');
  } else if (system.starState === 'starbinding_targeted') {
    push('map:starbinding_targeted', 'Starbinding target', 80, 'catastrophic');
  }

  const protection = getHazardProtectionLevel(state, system.id, playerId);
  if (protection === 'sealed') {
    push('map:singularity_sealed', 'Seal active', 70, 'seal');
  } else if (protection === 'inerting') {
    push('map:hazard_suppressed', 'Hazard suppressed', 65, 'inerting');
  } else if (isCollapsedSystem(system) || system.starState === 'collapsing') {
    push('map:singularity_hazard', 'Singularity hazard', 60, 'hazard');
  }

  if (system.isArchiveStar && !isCollapsedSystem(system)) {
    push('map:archive_star', 'Archive star', 40);
  }

  const hasDeposit = system.planets.some(p => (p.starsilkDeposit ?? 'none') !== 'none');
  if (hasDeposit) {
    push('map:strategic_deposit', 'Strategic deposit', 35);
  }

  const player = state.empires.find(e => e.id === playerId);
  if (player?.syrinInertingProgress?.systemsProtected.includes(system.id)) {
    push('map:inerted_system', 'Inerted', 50, 'inerting');
  }

  return badges.sort((a, b) => b.priority - a.priority);
}

export function getPrimaryMapBadge(
  system: StarSystem,
  state: GameState,
  playerId: string,
): MapStateBadge | null {
  const badges = getSystemMapStateBadges(system, state, playerId);
  return badges[0] ?? null;
}