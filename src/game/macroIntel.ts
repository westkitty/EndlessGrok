import { getMacro } from './macros';
import { formatActiveMacroEffect, getActiveMacroEffectsForEmpire } from './macroEffects';
import { getHazardProtectionLevel, getHazardProtectionLabel } from './hazards';
import { getVisibleRivalStarbindingProgress } from './aiStarbinding';
import type { ActiveMacroEffect, Empire, GameState } from './types';

export interface MacroIntelEntry {
  effectId: string;
  macroId: string;
  macroName: string;
  sourceEmpireId: string;
  sourceEmpireName: string;
  isHostile: boolean;
  systemId?: string;
  systemName?: string;
  turnsRemaining: number;
  summary: string;
  effectSummary: string;
}

export interface MacroIntelWarning {
  severity: 'low' | 'medium' | 'high';
  message: string;
  testId: string;
}

function isEffectVisibleToViewer(viewer: Empire, effect: ActiveMacroEffect): boolean {
  if (effect.empireId === viewer.id) return true;
  if (!effect.systemId) return false;
  return viewer.knownSystems.has(effect.systemId) || viewer.visibleSystems.has(effect.systemId);
}

export function getVisibleMacroIntel(state: GameState, viewerId: string): MacroIntelEntry[] {
  const viewer = state.empires.find(e => e.id === viewerId);
  if (!viewer) return [];

  const entries: MacroIntelEntry[] = [];
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    for (const effect of getActiveMacroEffectsForEmpire(empire)) {
      if (!isEffectVisibleToViewer(viewer, effect)) continue;
      const macro = getMacro(effect.macroId);
      const system = effect.systemId ? state.systems.find(s => s.id === effect.systemId) : undefined;
      entries.push({
        effectId: effect.id,
        macroId: effect.macroId,
        macroName: macro?.name ?? effect.macroId,
        sourceEmpireId: empire.id,
        sourceEmpireName: empire.name,
        isHostile: empire.id !== viewerId &&
          (viewer.diplomacy[empire.id] === 'war' || viewer.diplomacy[empire.id] === 'hostile'),
        systemId: effect.systemId,
        systemName: system?.name,
        turnsRemaining: effect.turnsRemaining,
        summary: formatActiveMacroEffect(effect),
        effectSummary: macro?.description ?? '',
      });
    }
  }
  return entries.sort((a, b) => b.turnsRemaining - a.turnsRemaining);
}

export function getMacroIntelWarnings(state: GameState, viewerId: string): MacroIntelWarning[] {
  const viewer = state.empires.find(e => e.id === viewerId);
  if (!viewer) return [];

  const warnings: MacroIntelWarning[] = [];
  const intel = getVisibleMacroIntel(state, viewerId);

  for (const entry of intel.filter(e => e.isHostile)) {
    const owned = entry.systemId &&
      state.systems.find(s => s.id === entry.systemId)?.planets.some(p => p.ownerId === viewerId);
    if (owned) {
      warnings.push({
        severity: entry.macroId.includes('biosphere') ? 'high' : 'medium',
        message: `Hostile macro: ${entry.macroName} on ${entry.systemName ?? 'your system'} (${entry.turnsRemaining} turns)`,
        testId: `macro-warn-hostile-${entry.effectId}`,
      });
    }
  }

  for (const system of state.systems) {
    if (!viewer.visibleSystems.has(system.id) && !viewer.knownSystems.has(system.id)) continue;
    const owned = system.planets.some(p => p.ownerId === viewerId);
    if (!owned) continue;
    const level = getHazardProtectionLevel(state, system.id, viewerId);
    if (level !== 'none') {
      const expiring = intel.find(
        e => e.systemId === system.id && e.sourceEmpireId === viewerId && e.turnsRemaining <= 2,
      );
      if (expiring) {
        warnings.push({
          severity: 'medium',
          message: `${system.name}: ${getHazardProtectionLabel(level)} expires in ${expiring.turnsRemaining} turn(s).`,
          testId: `macro-warn-expiry-${system.id}`,
        });
      }
    }
  }

  const rivals = getVisibleRivalStarbindingProgress(state, viewerId);
  for (const rival of rivals.filter(r => r.stage >= 5)) {
    warnings.push({
      severity: rival.stage >= 6 ? 'high' : 'medium',
      message: `${rival.empireName} Starbinding at stage ${rival.stage} (${Math.round(rival.progress * 100)}%)`,
      testId: `macro-warn-rival-sb-${rival.empireId}`,
    });
  }

  return warnings;
}

export function getMacroIntelSummary(state: GameState, viewerId: string): {
  friendlyCount: number;
  hostileCount: number;
  warnings: MacroIntelWarning[];
} {
  const intel = getVisibleMacroIntel(state, viewerId);
  return {
    friendlyCount: intel.filter(e => !e.isHostile).length,
    hostileCount: intel.filter(e => e.isHostile).length,
    warnings: getMacroIntelWarnings(state, viewerId),
  };
}