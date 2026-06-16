import { EMPIRE_COLORS, EMPIRE_EMBLEMS, EMPIRE_NAMES, EMPIRE_TRAITS } from './constants';
import { getTraitDescription } from './traits';
import type { EmblemId, Empire, EmpireTrait, PlayerSetup } from './types';

export interface FactionStartingBonus {
  credits?: number;
  food?: number;
  industry?: number;
  science?: number;
  influence?: number;
}

export interface FactionDefinition {
  index: number;
  name: string;
  color: string;
  emblem: EmblemId;
  trait: EmpireTrait;
  traitDescription: string;
  startingBonus: FactionStartingBonus;
  uniqueTechId?: string;
  researchHint: string;
}

export const FACTION_DEFINITIONS: FactionDefinition[] = EMPIRE_NAMES.map((name, index) => {
  const trait = EMPIRE_TRAITS[index % EMPIRE_TRAITS.length];
  const bonuses: FactionStartingBonus[] = [
    { credits: 20, food: 10 },
    { industry: 10, influence: 5 },
    { science: 8, food: 15 },
    { credits: 15, industry: 8 },
    { science: 12, credits: 10 },
  ];
  const hints = [
    'Prioritize trade networks and agriculture for steady growth.',
    'Focus frigate and destroyer designs for early military dominance.',
    'Research xenology and quantum computing for science victory.',
    'Expand quickly with orbital construction and mining.',
    'Pursue deep space scan and dreadnought designs.',
  ];
  const uniqueTechs = [
    undefined,
    'laser_weapons',
    'quantum_computing',
    'trade_networks',
    'xenology',
  ];

  return {
    index,
    name,
    color: EMPIRE_COLORS[index],
    emblem: EMPIRE_EMBLEMS[index],
    trait,
    traitDescription: getTraitDescription(trait),
    startingBonus: bonuses[index] ?? {},
    uniqueTechId: uniqueTechs[index],
    researchHint: hints[index] ?? 'Balance economy and military.',
  };
});

export function applyFactionStartingBonus(empire: Empire, factionIndex: number): void {
  const faction = FACTION_DEFINITIONS[factionIndex];
  if (!faction) return;
  const bonus = faction.startingBonus;
  if (bonus.credits) empire.resources.credits += bonus.credits;
  if (bonus.food) empire.resources.food += bonus.food;
  if (bonus.industry) empire.resources.industry += bonus.industry;
  if (bonus.science) empire.resources.science += bonus.science;
  if (bonus.influence) empire.influence += bonus.influence;
  empire.factionResearchHint = faction.researchHint;
}

/** Grant faction-unique technology if not already researched. */
export function applyFactionUniqueTech(empire: Empire, factionIndex: number): void {
  const faction = FACTION_DEFINITIONS[factionIndex];
  if (!faction?.uniqueTechId) return;
  if (!empire.researchedTechs.includes(faction.uniqueTechId)) {
    empire.researchedTechs.push(faction.uniqueTechId);
  }
}

export function getFactionIndexForEmpire(empireId: string): number {
  const match = empireId.match(/empire-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function factionToPlayerSetup(faction: FactionDefinition): PlayerSetup {
  return {
    name: faction.name,
    color: faction.color,
    emblem: faction.emblem,
    trait: faction.trait,
  };
}

export function getFactionByEmblem(emblem: EmblemId): FactionDefinition {
  return FACTION_DEFINITIONS.find(f => f.emblem === emblem) ?? FACTION_DEFINITIONS[0];
}

export function emblemIconName(emblem: EmblemId): `emblem-${EmblemId}` {
  return `emblem-${emblem}`;
}