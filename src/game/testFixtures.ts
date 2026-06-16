import { addOrRefreshMacroEffect } from './macroEffects';
import { ensureSyrinInertingProgress, SYRIN_INERTING_MIN_INERT, SYRIN_INERTING_MIN_MIST_APPLICATIONS, SYRIN_INERTING_REQUIRED_SYSTEMS } from './syrinInertingVictory';
import type { GameState } from './types';
import { createEmptyStarsilkResources } from './starsilkResources';
import { createStarbindingState } from './starbinding';

/** Deterministic unlock for E2E / unit tests — not exposed in normal UI. */
export function unlockStarbindingTestFixture(state: GameState, empireId?: string): void {
  const player = state.empires.find(e => e.id === (empireId ?? state.playerEmpireId));
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

/** Advance player Starbinding to provoke AI diplomatic warnings in E2E. */
export function simulatePlayerStarbindingThreat(state: GameState): void {
  unlockStarbindingTestFixture(state);
  const player = state.empires.find(e => e.id === state.playerEmpireId);
  if (!player?.capitalSystemId) return;

  const archive = state.systems.find(s => s.isArchiveStar && s.id !== player.capitalSystemId)
    ?? state.systems.find(s => s.isArchiveStar);
  if (!archive) return;

  player.starbinding = player.starbinding ?? createStarbindingState();
  player.starbinding.arraySystemId = player.capitalSystemId;
  player.starbinding.targetSystemIds = [archive.id];
  player.starbinding.completedDiveSystemIds = [archive.id];

  for (const ai of state.empires) {
    if (ai.isPlayer || !ai.isAlive || ai.isPirate) continue;
    ai.knownSystems.add(player.capitalSystemId);
    ai.knownSystems.add(archive.id);
    if (!ai.ideologyTags?.includes('archive')) {
      ai.ideologyTags = ['archive', 'syrin'];
    }
    ai.starbindingThreatWarned = {};
  }
}

/** Near-complete Syrin Inerting victory fixture for unit/E2E tests. */
export function setupSyrinInertingVictoryFixture(state: GameState, empireId?: string): void {
  unlockStarbindingTestFixture(state, empireId);
  const empire = state.empires.find(e => e.id === (empireId ?? state.playerEmpireId));
  if (!empire?.capitalSystemId) return;

  const progress = ensureSyrinInertingProgress(empire);
  const systems = state.systems
    .filter(s => s.id !== empire.capitalSystemId && s.systemType !== 'black_hole')
    .slice(0, SYRIN_INERTING_REQUIRED_SYSTEMS);

  for (const system of systems) {
    if (!progress.systemsProtected.includes(system.id)) {
      progress.systemsProtected.push(system.id);
      addOrRefreshMacroEffect(empire, 'syrin_inerting_mist', system.id, 'system', 5, state.turn);
    }
    empire.knownSystems.add(system.id);
  }
  progress.mistApplications = SYRIN_INERTING_MIN_MIST_APPLICATIONS;
  empire.starsilkResources!.inertStarsilk = SYRIN_INERTING_MIN_INERT;
  empire.starbinding!.completedDiveSystemIds = [];
}