import { ensureStarsilkResources } from './starsilkResources';
import type {
  ActiveMacroEffect,
  Empire,
  GameState,
  MacroEffectModifiers,
  Planet,
} from './types';

let macroEffectCounter = 0;

export function resetMacroEffectCounter(): void {
  macroEffectCounter = 0;
}

export function createMacroEffectId(): string {
  return `macro-effect-${macroEffectCounter++}`;
}

export const MACRO_EFFECT_PROFILES: Record<string, { modifiers: MacroEffectModifiers; recurring: boolean }> = {
  local_checksum_audit: { modifiers: { defenseBonusPct: 0.15, approvalPenalty: 5 }, recurring: true },
  syrin_inerting_mist: { modifiers: { hazardSuppressed: true }, recurring: true },
  siege_lattice_anchor: { modifiers: { defenseBonusPct: 0.25 }, recurring: true },
  gravity_thread_seal: { modifiers: { singularitySeal: true }, recurring: true },
  archive_extraction_loop: { modifiers: { archiveDataPerTurn: 1, approvalPenalty: 3 }, recurring: true },
};

export function migrateActiveMacroEffect(effect: ActiveMacroEffect, turn = 0): ActiveMacroEffect {
  const profile = MACRO_EFFECT_PROFILES[effect.macroId];
  return {
    id: effect.id ?? createMacroEffectId(),
    macroId: effect.macroId,
    empireId: effect.empireId,
    systemId: effect.systemId,
    planetId: effect.planetId,
    turnsRemaining: effect.turnsRemaining,
    createdTurn: effect.createdTurn ?? turn,
    modifiers: effect.modifiers ?? profile?.modifiers ?? {},
    recurring: effect.recurring ?? profile?.recurring ?? false,
  };
}

export function getMacroEffectProfile(macroId: string): { modifiers: MacroEffectModifiers; recurring: boolean } {
  return MACRO_EFFECT_PROFILES[macroId] ?? { modifiers: {}, recurring: false };
}

export function canStackMacroEffect(
  empire: Empire,
  macroId: string,
  targetId: string,
  targetType: 'system' | 'planet',
): boolean {
  const existing = (empire.activeMacroEffects ?? []).find(e => {
    if (e.macroId !== macroId) return false;
    if (targetType === 'system') return e.systemId === targetId;
    return e.planetId === targetId;
  });
  return !existing;
}

export function addOrRefreshMacroEffect(
  empire: Empire,
  macroId: string,
  targetId: string,
  targetType: 'system' | 'planet',
  duration: number,
  turn: number,
): ActiveMacroEffect {
  const profile = getMacroEffectProfile(macroId);
  empire.activeMacroEffects = empire.activeMacroEffects ?? [];

  const existingIdx = empire.activeMacroEffects.findIndex(e => {
    if (e.macroId !== macroId) return false;
    if (targetType === 'system') return e.systemId === targetId;
    return e.planetId === targetId;
  });

  if (existingIdx >= 0) {
    const existing = empire.activeMacroEffects[existingIdx];
    existing.turnsRemaining = Math.max(existing.turnsRemaining, duration);
    return existing;
  }

  const effect: ActiveMacroEffect = {
    id: createMacroEffectId(),
    macroId,
    empireId: empire.id,
    turnsRemaining: duration,
    createdTurn: turn,
    modifiers: { ...profile.modifiers },
    recurring: profile.recurring,
  };
  if (targetType === 'system') effect.systemId = targetId;
  else effect.planetId = targetId;

  empire.activeMacroEffects.push(effect);
  return effect;
}

export function getActiveMacroEffectsForSystem(
  state: GameState,
  systemId: string,
): ActiveMacroEffect[] {
  return state.empires.flatMap(e => e.activeMacroEffects ?? [])
    .filter(e => e.systemId === systemId && e.turnsRemaining > 0);
}

export function getActiveMacroEffectsForPlanet(
  state: GameState,
  planetId: string,
): ActiveMacroEffect[] {
  return state.empires.flatMap(e => e.activeMacroEffects ?? [])
    .filter(e => e.planetId === planetId && e.turnsRemaining > 0);
}

export function getActiveMacroEffectsForEmpire(empire: Empire): ActiveMacroEffect[] {
  return (empire.activeMacroEffects ?? []).filter(e => e.turnsRemaining > 0);
}

export function getSystemMacroDefenseBonusPct(state: GameState, systemId: string, ownerId: string): number {
  let bonus = 0;
  for (const effect of getActiveMacroEffectsForSystem(state, systemId)) {
    if (effect.empireId !== ownerId) continue;
    bonus += effect.modifiers.defenseBonusPct ?? 0;
  }
  return bonus;
}

export function isSystemHazardSuppressed(state: GameState, systemId: string, empireId: string): boolean {
  return getActiveMacroEffectsForSystem(state, systemId).some(
    e => e.empireId === empireId && (e.modifiers.hazardSuppressed || e.modifiers.singularitySeal),
  );
}

export function applyRecurringMacroEffects(state: GameState, empire: Empire): void {
  const effects = getActiveMacroEffectsForEmpire(empire).filter(e => e.recurring);
  const pool = ensureStarsilkResources(empire);

  for (const effect of effects) {
    if (effect.modifiers.archiveDataPerTurn) {
      pool.archiveData += effect.modifiers.archiveDataPerTurn;
    }
    if (effect.modifiers.sciencePerTurn) {
      empire.resources.science += effect.modifiers.sciencePerTurn;
    }
    if (effect.modifiers.approvalPenalty) {
      const targets = effect.planetId
        ? state.systems.flatMap(s => s.planets).filter(p => p.id === effect.planetId)
        : effect.systemId
          ? state.systems.find(s => s.id === effect.systemId)?.planets.filter(p => p.ownerId === empire.id) ?? []
          : state.systems.flatMap(s => s.planets).filter(p => p.ownerId === empire.id && p.isColonized);

      for (const planet of targets) {
        planet.approval = Math.max(0, planet.approval - Math.floor(effect.modifiers.approvalPenalty / 2));
        planet.happiness = Math.max(0, planet.happiness - Math.floor(effect.modifiers.approvalPenalty / 3));
      }
    }
  }
}

export function processMacroEffectDurations(state: GameState, empire: Empire): void {
  if (!empire.macroCooldowns) empire.macroCooldowns = [];
  for (const cd of empire.macroCooldowns) {
    if (cd.turnsRemaining > 0) cd.turnsRemaining--;
  }
  empire.macroCooldowns = empire.macroCooldowns.filter(c => c.turnsRemaining > 0);

  if (!empire.activeMacroEffects?.length) return;

  const expiring: ActiveMacroEffect[] = [];
  for (const effect of empire.activeMacroEffects) {
    if (effect.turnsRemaining > 0) effect.turnsRemaining--;
    if (effect.turnsRemaining <= 0) expiring.push(effect);
  }

  for (const effect of expiring) {
    const macroName = effect.macroId.replace(/_/g, ' ');
    state.events.push({
      turn: state.turn,
      type: 'macro',
      message: `Macro expired: ${macroName}. Checksum loop terminated.`,
    });
  }

  empire.activeMacroEffects = empire.activeMacroEffects.filter(e => e.turnsRemaining > 0);
}

export function scrubMacroEffectsInSystem(
  state: GameState,
  systemId: string,
  scrubberEmpireId: string,
  removeAllHostile = true,
): number {
  let removed = 0;
  for (const empire of state.empires) {
    if (empire.id === scrubberEmpireId) continue;
    const before = empire.activeMacroEffects?.length ?? 0;
    empire.activeMacroEffects = (empire.activeMacroEffects ?? []).filter(e => {
      if (e.systemId !== systemId) return true;
      if (removeAllHostile) return false;
      return true;
    });
    removed += before - (empire.activeMacroEffects?.length ?? 0);
  }
  return removed;
}

export function weakenMacroEffect(effect: ActiveMacroEffect, turnsRemoved: number): void {
  effect.turnsRemaining = Math.max(0, effect.turnsRemaining - turnsRemoved);
  if (effect.modifiers.defenseBonusPct) {
    effect.modifiers.defenseBonusPct *= 0.5;
  }
}

export function formatActiveMacroEffect(effect: ActiveMacroEffect): string {
  const name = effect.macroId.replace(/_/g, ' ');
  const target = effect.systemId ? `system ${effect.systemId}` : effect.planetId ? `planet` : 'empire';
  return `${name} on ${target} (${effect.turnsRemaining} turns)`;
}

export function getMacroApprovalModifierForPlanet(state: GameState, planet: Planet): number {
  let penalty = 0;
  for (const empire of state.empires) {
    for (const effect of empire.activeMacroEffects ?? []) {
      if (effect.turnsRemaining <= 0) continue;
      if (effect.planetId === planet.id || (effect.systemId === planet.systemId && effect.empireId === planet.ownerId)) {
        penalty += effect.modifiers.approvalPenalty ?? 0;
      }
    }
  }
  return penalty;
}