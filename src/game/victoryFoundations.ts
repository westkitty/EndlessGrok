import { DOMINATION_THRESHOLD, INFLUENCE_VICTORY_THRESHOLD } from './constants';
import { getColonizablePlanets } from './galaxy';
import { isCollapsedSystem } from './heliocide';
import type { GameState, VictoryProgress } from './types';

export type VictoryPathStatus = 'complete' | 'foundation' | 'locked';

export interface VictoryPathInfo {
  id: keyof VictoryProgress;
  status: VictoryPathStatus;
  completable: boolean;
  foundationNote?: string;
}

const FOUNDATION_THRESHOLD = 0.85;

export function getVictoryPathInfo(state: GameState, empireId: string): VictoryPathInfo[] {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return [];

  const colonizable = getColonizablePlanets(state.systems);
  const owned = colonizable.filter(p => p.ownerId === empire.id && p.isColonized).length;
  const domination = colonizable.length > 0 ? owned / colonizable.length / DOMINATION_THRESHOLD : 0;
  const influencePct = Math.round(Math.min(1, empire.influence / INFLUENCE_VICTORY_THRESHOLD) * 100);
  const collapsedByPlayer = state.systems.filter(s =>
    isCollapsedSystem(s) && empire.starbinding?.completedDiveSystemIds.includes(s.id),
  ).length;

  return [
    {
      id: 'starbinding',
      status: 'complete',
      completable: true,
      foundationNote: collapsedByPlayer > 0
        ? `${collapsedByPlayer} heliocide(s) logged — victory path is morally compromised, not clean.`
        : undefined,
    },
    {
      id: 'ledgerDominion',
      status: empire.researchedTechs.includes('influence_projection') ? 'foundation' : 'locked',
      completable: false,
      foundationNote: `Foundation: influence at ${influencePct}% of threshold + territorial control tracked. Vassalization audits not yet completable.`,
    },
    {
      id: 'archiveContinuity',
      status: empire.researchedTechs.includes('archive_syntax') ? 'foundation' : 'locked',
      completable: false,
      foundationNote: 'Foundation: Archive Data and research progress tracked. Preservation victory threshold not enforced.',
    },
    {
      id: 'bloodEclipse',
      status: empire.researchedTechs.includes('planetary_engineering') ? 'foundation' : 'locked',
      completable: false,
      foundationNote: 'Foundation: Blood Ring Glass and biosphere render tracked. Terraforming victory not completable.',
    },
    {
      id: 'syrinInerting',
      status: empire.researchedTechs.includes('syrin_inerting_method') ? 'foundation' : 'locked',
      completable: false,
      foundationNote: 'Foundation: inert Starsilk tracked. Containment victory requires heliocide prevention — not yet enforced.',
    },
    {
      id: 'domination',
      status: domination >= 1 ? 'complete' : 'foundation',
      completable: true,
    },
    {
      id: 'science',
      status: 'complete',
      completable: true,
    },
  ];
}

export function isVictoryPathCompletable(id: keyof VictoryProgress): boolean {
  return id === 'starbinding' || id === 'domination' || id === 'science' ||
    id === 'influence' || id === 'economy' || id === 'survival';
}

export function getFoundationProgressLabel(progress: number): string {
  if (progress >= FOUNDATION_THRESHOLD) return 'Near foundation ceiling — victory trigger not wired';
  if (progress > 0) return 'Foundation progress';
  return 'Not started';
}