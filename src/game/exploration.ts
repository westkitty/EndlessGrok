import { EXPLORATION_SCIENCE_BONUS } from './constants';
import { areSystemsConnected, getAdjacentSystems } from './galaxy';
import type { Empire, Fleet, GameState } from './types';

const FIRST_VISIT_SNIPPETS = [
  'Long-range scans reveal habitable zones and mineral signatures.',
  'Navigation buoys mark this system on your star charts for the first time.',
  'Your scouts report strange energy readings from the outer planets.',
  'Colonial survey teams recommend further study of local resources.',
  'The void here feels untouched — a frontier waiting to be claimed.',
  'Ancient debris fields suggest this system was once a trade hub.',
];

export function recordFirstSystemVisit(state: GameState, empire: Empire, systemId: string): void {
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return;

  if (!empire.knownSystems.has(systemId)) return;
  const visitKey = `visited-${empire.id}-${systemId}`;
  const alreadyVisited = state.events.some(e => e.message.includes(visitKey));
  if (alreadyVisited) return;

  const snippet = FIRST_VISIT_SNIPPETS[(state.seed + systemId.charCodeAt(2)) % FIRST_VISIT_SNIPPETS.length];
  state.events.push({
    turn: state.turn,
    type: 'explore',
    message: `${empire.name} first visit to ${system.name}: ${snippet} [${visitKey}]`,
  });

  if (system.anomaly) {
    const anomalyKey = `anomaly-science-${empire.id}-${systemId}`;
    const alreadyGranted = state.events.some(e => e.message.includes(anomalyKey));
    if (!alreadyGranted) {
      empire.resources.science += EXPLORATION_SCIENCE_BONUS;
      state.events.push({
        turn: state.turn,
        type: 'explore',
        message: `${empire.name} discovered anomaly in ${system.name}: +${EXPLORATION_SCIENCE_BONUS} science [${anomalyKey}]`,
      });
    }
  }
}

export function processFleetExploration(state: GameState): void {
  for (const fleet of state.fleets) {
    const empire = state.empires.find(e => e.id === fleet.empireId);
    if (!empire?.isAlive) continue;
    recordFirstSystemVisit(state, empire, fleet.systemId);
  }
}

function pickAutoExploreTarget(
  empire: Empire,
  fleet: Fleet,
  systems: GameState['systems']
): string | null {
  const current = systems.find(s => s.id === fleet.systemId);
  if (!current) return null;

  const neighbors = getAdjacentSystems(systems, current.id);
  const unknown = neighbors.filter(s => !empire.knownSystems.has(s.id));
  if (unknown.length > 0) {
    return unknown.sort((a, b) => a.id.localeCompare(b.id))[0].id;
  }

  const frontier = neighbors.filter(s =>
    !empire.visibleSystems.has(s.id) ||
    (s.anomaly && !s.exploredBy[empire.id])
  );
  if (frontier.length > 0) {
    return frontier.sort((a, b) => a.id.localeCompare(b.id))[0].id;
  }

  if (neighbors.length > 0) {
    return neighbors.sort((a, b) => a.id.localeCompare(b.id))[0].id;
  }

  return null;
}

/** Move player fleets with auto-explore enabled one hop toward unknown systems. */
export function processPlayerAutoExplore(state: GameState): void {
  const player = state.empires.find(e => e.id === state.playerEmpireId);
  if (!player?.isAlive) return;

  for (const fleet of state.fleets) {
    if (fleet.empireId !== player.id) continue;
    if (!fleet.autoExplore || fleet.movesRemaining <= 0) continue;
    if (fleet.destinationSystemId) continue;
    if (fleet.hasColonyShip) continue;

    const targetId = pickAutoExploreTarget(player, fleet, state.systems);
    if (!targetId) continue;
    if (!areSystemsConnected(state.systems, fleet.systemId, targetId)) continue;

    fleet.systemId = targetId;
    fleet.movesRemaining--;
    player.knownSystems.add(targetId);
    player.visibleSystems.add(targetId);
    for (const connId of state.systems.find(s => s.id === targetId)?.connections ?? []) {
      player.knownSystems.add(connId);
    }

    state.events.push({
      turn: state.turn,
      type: 'explore',
      message: `Auto-explore: fleet reached ${state.systems.find(s => s.id === targetId)?.name}`,
    });
  }
}