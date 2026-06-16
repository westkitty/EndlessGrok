import { LEADER_TITLES } from './constants';
import { SeededRNG } from './rng';

export function generateLeaderTitle(rng: SeededRNG): string {
  return rng.pick(LEADER_TITLES);
}

export function generateEmpireDisplayName(baseName: string, rng: SeededRNG): { name: string; leaderTitle: string } {
  const leaderTitle = generateLeaderTitle(rng);
  const suffixes = ['of the Core', 'of the Rim', 'of the Expanse', 'of the Void', 'of the Stars'];
  const useSuffix = rng.next() < 0.35;
  const name = useSuffix ? `${baseName} ${rng.pick(suffixes)}` : baseName;
  return { name, leaderTitle };
}