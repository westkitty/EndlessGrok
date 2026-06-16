import { hasUnlock } from './research';
import { ensureStarsilkResources, spendStarsilkCost } from './starsilkResources';
import { getFactionReactionToBloodRingUse } from './factionIdeology';
import { emitFirstMacroEvent } from './starsilkEvents';
import type {
  ActiveMacroEffect,
  Empire,
  GameState,
  StarsilkResources,
} from './types';

export type MacroTargetType = 'empire' | 'system' | 'planet';

export interface MacroDefinition {
  id: string;
  name: string;
  category: 'stability' | 'terraform' | 'inerting' | 'fortification' | 'extraction' | 'biosphere' | 'seal' | 'counter';
  description: string;
  requiredTech?: string;
  cost: Partial<StarsilkResources> & { influence?: number };
  targetType: MacroTargetType;
  cooldown: number;
  risk: string;
  effectTurns: number;
  loreBasis: string;
}

export const MACROS: MacroDefinition[] = [
  {
    id: 'local_checksum_audit',
    name: 'Local Checksum Audit',
    category: 'stability',
    description: '+15% system defense, -5 approval empire-wide for 3 turns',
    requiredTech: 'macro_execution',
    cost: { archiveData: 1 },
    targetType: 'system',
    cooldown: 4,
    risk: 'Reduces approval — stability through audit is never free',
    effectTurns: 3,
    loreBasis: 'Administrative checksum loop',
  },
  {
    id: 'first_dirt_protocol',
    name: 'First Dirt Protocol',
    category: 'terraform',
    description: 'Restore limited habitability on ruined world (+1 pop, +food)',
    requiredTech: 'macro_execution',
    cost: { syrinReagent: 1, archiveData: 1 },
    targetType: 'planet',
    cooldown: 6,
    risk: 'None documented',
    effectTurns: 0,
    loreBasis: 'Frontier restoration macro',
  },
  {
    id: 'syrin_inerting_mist',
    name: 'Syrin Inerting Mist',
    category: 'inerting',
    description: 'Suppress Starsilk hazard in system for 5 turns',
    requiredTech: 'syrin_inerting_method',
    cost: { syrinReagent: 2 },
    targetType: 'system',
    cooldown: 5,
    risk: 'Consumes Syrin — inerting is expensive',
    effectTurns: 5,
    loreBasis: 'Syrin containment macro',
  },
  {
    id: 'siege_lattice_anchor',
    name: 'Siege Lattice Anchor',
    category: 'fortification',
    description: 'Fortify chokepoint or collapsed system (+defense rating)',
    requiredTech: 'macro_execution',
    cost: { siegeLatticeFragment: 1, starsilkThread: 1 },
    targetType: 'system',
    cooldown: 4,
    risk: 'Anchors singularity-adjacent systems — fleet hazard remains',
    effectTurns: 6,
    loreBasis: 'Lattice containment macro',
  },
  {
    id: 'archive_extraction_loop',
    name: 'Archive Extraction Loop',
    category: 'extraction',
    description: '+3 Archive Data, -10 happiness on target planet',
    requiredTech: 'archive_syntax',
    cost: { starsilkThread: 1 },
    targetType: 'planet',
    cooldown: 3,
    risk: 'Destabilizes local population',
    effectTurns: 0,
    loreBasis: 'Archive harvest macro',
  },
  {
    id: 'drakken_biosphere_render',
    name: 'Drakken Biosphere Render',
    category: 'biosphere',
    description: 'Convert population to industry (+industry, -population)',
    requiredTech: 'macro_execution',
    cost: { bloodRingGlass: 1 },
    targetType: 'planet',
    cooldown: 5,
    risk: 'Diplomatic penalty from non-Drakken factions',
    effectTurns: 0,
    loreBasis: 'Drakken infrastructure macro',
  },
  {
    id: 'gravity_thread_seal',
    name: 'Gravity Thread Seal',
    category: 'seal',
    description: 'Protect fleets in system from singularity hazard for 4 turns',
    requiredTech: 'partition_mathematics',
    cost: { inertStarsilk: 1 },
    targetType: 'system',
    cooldown: 4,
    risk: 'Requires stabilized Starsilk',
    effectTurns: 4,
    loreBasis: 'Partition geometry seal',
  },
  {
    id: 'counter_macro_scrub',
    name: 'Counter-Macro Scrub',
    category: 'counter',
    description: 'Remove active enemy macro effect in system',
    requiredTech: 'macro_execution',
    cost: { archiveData: 2, syrinReagent: 1 },
    targetType: 'system',
    cooldown: 3,
    risk: 'May fail if enemy macro is lattice-anchored',
    effectTurns: 0,
    loreBasis: 'Anti-macro checksum scrub',
  },
];

export function getMacro(id: string): MacroDefinition | undefined {
  return MACROS.find(m => m.id === id);
}

export function getAvailableMacros(empire: Empire): MacroDefinition[] {
  return MACROS.filter(m => {
    if (!m.requiredTech) return true;
    return hasUnlock(empire.researchedTechs, m.requiredTech) || empire.researchedTechs.includes(m.requiredTech);
  });
}

export function getMacroCooldown(empire: Empire, macroId: string): number {
  const cd = empire.macroCooldowns?.find(c => c.macroId === macroId);
  return cd?.turnsRemaining ?? 0;
}

export function canExecuteMacro(
  state: GameState,
  empireId: string,
  macroId: string,
  targetId: string,
): string | null {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return 'Empire not found';
  const macro = getMacro(macroId);
  if (!macro) return 'Unknown macro';
  if (!getAvailableMacros(empire).some(m => m.id === macroId)) return 'Macro locked';

  if (getMacroCooldown(empire, macroId) > 0) {
    return `Cooldown: ${getMacroCooldown(empire, macroId)} turns`;
  }

  if (macro.cost.influence && empire.influence < macro.cost.influence) {
    return 'Not enough influence';
  }
  if (!canAffordMacroCost(empire, macro)) return 'Insufficient Starsilk resources';

  if (macro.targetType === 'system') {
    const system = state.systems.find(s => s.id === targetId);
    if (!system) return 'System not found';
    if (!empire.knownSystems.has(targetId)) return 'System unknown';
  }
  if (macro.targetType === 'planet') {
    const planet = state.systems.flatMap(s => s.planets).find(p => p.id === targetId);
    if (!planet) return 'Planet not found';
    if (planet.ownerId !== empireId) return 'Planet not owned';
  }

  return null;
}

function canAffordMacroCost(empire: Empire, macro: MacroDefinition): boolean {
  const pool = ensureStarsilkResources(empire);
  if (macro.cost.influence && empire.influence < macro.cost.influence) return false;
  for (const [key, val] of Object.entries(macro.cost)) {
    if (key === 'influence') continue;
    const k = key as keyof StarsilkResources;
    if ((pool[k] ?? 0) < (val ?? 0)) return false;
  }
  return true;
}

export function executeMacro(
  state: GameState,
  empireId: string,
  macroId: string,
  targetId: string,
): boolean {
  const err = canExecuteMacro(state, empireId, macroId, targetId);
  if (err) return false;

  const empire = state.empires.find(e => e.id === empireId)!;
  const macro = getMacro(macroId)!;
  const { influence, ...starsilkCost } = macro.cost;
  if (influence) empire.influence -= influence;
  if (!spendStarsilkCost(empire, starsilkCost)) return false;

  applyMacroEffect(state, empire, macro, targetId);

  empire.macroCooldowns = empire.macroCooldowns ?? [];
  const existing = empire.macroCooldowns.find(c => c.macroId === macroId);
  if (existing) {
    existing.turnsRemaining = macro.cooldown;
  } else {
    empire.macroCooldowns.push({ macroId, turnsRemaining: macro.cooldown });
  }

  if (macroId === 'drakken_biosphere_render') {
    for (const other of state.empires) {
      if (!other.isAlive || other.id === empireId) continue;
      const delta = getFactionReactionToBloodRingUse(other);
      other.relationScores = other.relationScores ?? {};
      other.relationScores[empireId] = (other.relationScores[empireId] ?? 50) + delta;
    }
  }

  emitFirstMacroEvent(state, empire, macro.name);
  state.events.push({
    turn: state.turn,
    type: 'macro',
    message: `Macro executed: ${macro.name}. ${macro.risk}`,
  });
  return true;
}

function applyMacroEffect(
  state: GameState,
  empire: Empire,
  macro: MacroDefinition,
  targetId: string,
): void {
  if (macro.effectTurns > 0) {
    empire.activeMacroEffects = empire.activeMacroEffects ?? [];
    const effect: ActiveMacroEffect = {
      macroId: macro.id,
      empireId: empire.id,
      turnsRemaining: macro.effectTurns,
    };
    if (macro.targetType === 'system') effect.systemId = targetId;
    if (macro.targetType === 'planet') effect.planetId = targetId;
    empire.activeMacroEffects.push(effect);
  }

  switch (macro.id) {
    case 'first_dirt_protocol': {
      const planet = state.systems.flatMap(s => s.planets).find(p => p.id === targetId);
      if (planet) {
        planet.population = Math.min(planet.maxPopulation, planet.population + 1);
        planet.foodOutput += 1;
        planet.happiness = Math.min(100, planet.happiness + 5);
      }
      break;
    }
    case 'archive_extraction_loop': {
      const planet = state.systems.flatMap(s => s.planets).find(p => p.id === targetId);
      const pool = ensureStarsilkResources(empire);
      pool.archiveData += 3;
      if (planet) planet.happiness = Math.max(0, planet.happiness - 10);
      break;
    }
    case 'drakken_biosphere_render': {
      const planet = state.systems.flatMap(s => s.planets).find(p => p.id === targetId);
      if (planet && planet.population > 1) {
        planet.population -= 1;
        empire.resources.industry += 15;
        planet.industryOutput += 2;
      }
      break;
    }
    case 'counter_macro_scrub': {
      for (const other of state.empires) {
        if (other.id === empire.id) continue;
        other.activeMacroEffects = (other.activeMacroEffects ?? []).filter(
          e => e.systemId !== targetId,
        );
      }
      break;
    }
    default:
      break;
  }
}

export function processMacroCooldowns(empire: Empire): void {
  if (!empire.macroCooldowns) return;
  for (const cd of empire.macroCooldowns) {
    if (cd.turnsRemaining > 0) cd.turnsRemaining--;
  }
  empire.macroCooldowns = empire.macroCooldowns.filter(c => c.turnsRemaining > 0);

  if (!empire.activeMacroEffects) return;
  for (const effect of empire.activeMacroEffects) {
    if (effect.turnsRemaining > 0) effect.turnsRemaining--;
  }
  empire.activeMacroEffects = empire.activeMacroEffects.filter(e => e.turnsRemaining > 0);
}