import { isCollapsedSystem, SINGULARITY_FLEET_HAZARD_CHANCE } from './heliocide';
import { getActiveMacroEffectsForSystem } from './macroEffects';
import { SeededRNG } from './rng';
import type { Fleet, GameState, StarSystem } from './types';

export const MITIGATED_HAZARD_CHANCE = 0.1;
export const SEALED_HAZARD_CHANCE = 0.14;
export const COLLAPSE_POPULATION_LOSS_SEALED = 0.5;
export const COLLAPSE_POPULATION_LOSS_DEFAULT = 0.8;

export function isSingularityHazardSystem(system: StarSystem): boolean {
  return isCollapsedSystem(system) || system.starState === 'collapsing';
}

export function hasSingularitySeal(state: GameState, systemId: string, empireId: string): boolean {
  return getActiveMacroEffectsForSystem(state, systemId).some(
    e => e.empireId === empireId && e.modifiers.singularitySeal && e.turnsRemaining > 0,
  );
}

export function hasHazardSuppression(state: GameState, systemId: string, empireId: string): boolean {
  return getActiveMacroEffectsForSystem(state, systemId).some(
    e => e.empireId === empireId && e.modifiers.hazardSuppressed && e.turnsRemaining > 0,
  );
}

export type HazardProtectionLevel = 'none' | 'inerting' | 'sealed';

export function getHazardProtectionLevel(
  state: GameState,
  systemId: string,
  empireId: string,
): HazardProtectionLevel {
  if (hasSingularitySeal(state, systemId, empireId)) return 'sealed';
  if (hasHazardSuppression(state, systemId, empireId)) return 'inerting';
  return 'none';
}

export function getFleetSingularityHazardChance(
  state: GameState,
  fleet: Fleet,
  systemId: string,
): number {
  const system = state.systems.find(s => s.id === systemId);
  if (!system || !isSingularityHazardSystem(system)) return 0;
  const level = getHazardProtectionLevel(state, systemId, fleet.empireId);
  if (level === 'sealed') return SEALED_HAZARD_CHANCE;
  if (level === 'inerting') return MITIGATED_HAZARD_CHANCE;
  return SINGULARITY_FLEET_HAZARD_CHANCE;
}

export function getCollapsePopulationLossFactor(
  state: GameState,
  systemId: string,
  empireId: string,
): number {
  const level = getHazardProtectionLevel(state, systemId, empireId);
  if (level === 'sealed') return COLLAPSE_POPULATION_LOSS_SEALED;
  if (level === 'inerting') return 0.65;
  return COLLAPSE_POPULATION_LOSS_DEFAULT;
}

export function applyFleetSingularityHazard(
  state: GameState,
  fleet: Fleet,
  systemId: string,
  rng: SeededRNG,
  context: 'travel' | 'collapse',
): boolean {
  const chance = getFleetSingularityHazardChance(state, fleet, systemId);
  if (chance <= 0 || fleet.ships.length === 0) return false;
  if (rng.next() >= chance) return false;

  const before = fleet.ships.length;
  fleet.ships = fleet.ships.slice(0, Math.max(1, Math.floor(fleet.ships.length * 0.5)));
  const lost = before - fleet.ships.length;
  if (lost <= 0) return false;

  const system = state.systems.find(s => s.id === systemId)!;
  const level = getHazardProtectionLevel(state, systemId, fleet.empireId);
  const empire = state.empires.find(e => e.id === fleet.empireId);

  if (level === 'none') {
    state.events.push({
      turn: state.turn,
      type: 'heliocide',
      message: context === 'travel'
        ? `Unprotected fleet entered singularity hazard at ${system.name}. ${lost} ship(s) lost.`
        : `${empire?.name ?? 'Fleet'} caught in collapse at ${system.name} without seal. ${lost} ship(s) lost.`,
    });
  } else {
    state.events.push({
      turn: state.turn,
      type: 'macro',
      message: `Hazard ${level === 'sealed' ? 'seal' : 'inerting'} mitigated damage at ${system.name} — ${lost} ship(s) still lost. Mitigation is not safety.`,
    });
  }
  return true;
}

export function processTravelSingularityHazards(
  state: GameState,
  fleet: Fleet,
  enteredSystemId: string,
  previousSystemId: string,
  rng: SeededRNG,
): void {
  if (enteredSystemId === previousSystemId) return;
  const system = state.systems.find(s => s.id === enteredSystemId);
  if (!system || !isSingularityHazardSystem(system)) return;

  const level = getHazardProtectionLevel(state, enteredSystemId, fleet.empireId);
  if (level !== 'none') {
    state.events.push({
      turn: state.turn,
      type: 'macro',
      message: `Fleet entered ${system.name} under ${level === 'sealed' ? 'gravity thread seal' : 'inerting mist'} protection. Hazard mitigated, not erased.`,
    });
  }
  applyFleetSingularityHazard(state, fleet, enteredSystemId, rng, 'travel');
}

export function getHazardProtectionLabel(level: HazardProtectionLevel): string {
  switch (level) {
    case 'sealed': return 'Gravity seal active — hazard mitigated';
    case 'inerting': return 'Inerting mist active — hazard reduced';
    default: return 'No hazard protection';
  }
}

export function getStarbindingSafetyBonus(state: GameState, empireId: string, systemId: string): number {
  const level = getHazardProtectionLevel(state, systemId, empireId);
  if (level === 'sealed') return 0.35;
  if (level === 'inerting') return 0.2;
  return 0;
}