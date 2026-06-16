import type { GameState } from './types';
import { createEmptyStarsilkResources } from './starsilkResources';
import { createStarbindingState } from './starbinding';

/** Deterministic unlock for E2E / unit tests — not exposed in normal UI. */
export function unlockStarbindingTestFixture(state: GameState): void {
  const player = state.empires.find(e => e.id === state.playerEmpireId);
  if (!player) return;

  const techs = [
    'forbidden_starbinding',
    'partition_mathematics',
    'syrin_inerting_method',
    'archive_syntax',
    'macro_execution',
    'starsilk_extraction',
    'strategic_resources',
    'deep_space_scan',
    'quantum_computing',
    'singularity_drive',
  ];
  for (const id of techs) {
    if (!player.researchedTechs.includes(id)) {
      player.researchedTechs.push(id);
    }
  }

  player.starsilkResources = {
    ...createEmptyStarsilkResources(),
    starsilkThread: 5,
    syrinReagent: 5,
    inertStarsilk: 5,
    archiveData: 10,
  };
  player.starbinding = createStarbindingState();

  if (!state.systems.some(s => s.isArchiveStar)) {
    const target = state.systems.find(s => s.systemType !== 'black_hole' && s.id !== player.capitalSystemId);
    if (target) target.isArchiveStar = true;
  }
}