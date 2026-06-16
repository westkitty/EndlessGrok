import type { EmblemId } from './types';

export const GALAXY_SIZE = 800;
export const SYSTEM_COUNT = 24;
export const MIN_SYSTEM_DISTANCE = 80;
export const MAX_TURNS = 100;

export const GALAXY_SIZE_OPTIONS = {
  small: { systemCount: 16, mapSize: 600, minDistance: 70 },
  medium: { systemCount: 24, mapSize: 800, minDistance: 80 },
  large: { systemCount: 36, mapSize: 1000, minDistance: 90 },
  huge: { systemCount: 48, mapSize: 1200, minDistance: 95 },
} as const;

export const GALAXY_SHAPES = ['spiral', 'cluster', 'ring', 'elliptical', 'sparse'] as const;

export const DIFFICULTY_SETTINGS = {
  easy: {
    playerResourceBonus: 1.15,
    aiResourceBonus: 0.85,
    aiAggression: 0.6,
    aiExpansionMultiplier: 0.7,
    aiAggressionMultiplier: 0.6,
    startingCreditsBonus: 30,
  },
  normal: {
    playerResourceBonus: 1.0,
    aiResourceBonus: 1.0,
    aiAggression: 1.0,
    aiExpansionMultiplier: 1.0,
    aiAggressionMultiplier: 1.0,
    startingCreditsBonus: 0,
  },
  hard: {
    playerResourceBonus: 0.9,
    aiResourceBonus: 1.2,
    aiAggression: 1.4,
    aiExpansionMultiplier: 1.3,
    aiAggressionMultiplier: 1.4,
    startingCreditsBonus: -20,
  },
} as const;

export const OVEREXPANSION_PLANET_THRESHOLD = 8;
export const OVEREXPANSION_APPROVAL_PENALTY = 5;

export const FLEET_UPKEEP: Record<string, number> = {
  scout: 2,
  frigate: 4,
  cruiser: 6,
  destroyer: 8,
  carrier: 10,
  colony: 3,
  dreadnought: 15,
};

export const BUILDING_MAINTENANCE: Record<string, number> = {
  farm: 1,
  factory: 2,
  lab: 2,
  spaceport: 3,
  defense_grid: 2,
  hospital: 1,
  mining_complex: 2,
  market: 2,
  academy: 2,
  fortress: 3,
  orbital_station: 4,
};

export const TRADE_ROUTE_CREDITS_PER_PAIR = 5;
export const RESEARCH_PACT_SCIENCE_BONUS = 3;

export const COLONY_DEVELOPMENT_MAX = 5;
export const COLONY_DEVELOPMENT_COST = { credits: 50, industry: 25 };

export const TERRAFORMING_COST_INDUSTRY = 15;
export const TERRAFORMING_TURNS = 3;

export const QUALITY_OUTPUT_MODS = {
  poor: 0.7,
  average: 1.0,
  rich: 1.25,
  exceptional: 1.5,
} as const;

export const BLOCKER_HABITABILITY_PENALTY = 0.15;
export const LUXURY_MORALE_BONUS = 5;

export const FLEET_COMMAND_BASE = 6;
export const FLEET_COMMAND_PER_TECH = 4;
export const VETERAN_BATTLE_THRESHOLD = 3;
export const VETERAN_COMBAT_BONUS = 0.1;

export const RETREAT_SURVIVOR_RATIO = 0.5;
export const SALVAGE_CREDITS_PER_SHIP = 8;
export const BOMBARDMENT_POP_LOSS = 2;

export const EVENT_LOG_MAX = 100;
export const AUTOSAVE_INTERVAL = 5;

export const PIRATE_SPAWN_TURN = 30;

export const BLOCKER_CLEAR_COSTS: Record<string, { credits: number; industry: number }> = {
  radiation: { credits: 40, industry: 20 },
  tectonic: { credits: 35, industry: 25 },
  toxic_atmosphere: { credits: 45, industry: 30 },
};

export const EVENT_CHAIN_TEMPLATES = [
  { id: 'precursor_trail', name: 'Precursor Trail', maxSteps: 3 },
  { id: 'trade_expansion', name: 'Trade Expansion', maxSteps: 2 },
] as const;

export const LEADER_TITLES = [
  'Emperor', 'Chancellor', 'Archon', 'Supreme Admiral', 'High Magister',
  'Grand Consul', 'Star Lord', 'Prime Director', 'Sovereign', 'Regent',
];

export const STARTING_CREDITS = 150;
export const STARTING_FOOD = 50;
export const STARTING_INDUSTRY = 30;
export const STARTING_SCIENCE = 10;
export const STARTING_INFLUENCE = 10;

export const COLONY_SHIP_COST = { credits: 80, industry: 20 };
export const SCOUT_COST = { credits: 40, industry: 10 };
export const FRIGATE_COST = { credits: 60, industry: 15 };
export const CRUISER_COST = { credits: 120, industry: 35 };
export const DESTROYER_COST = { credits: 150, industry: 45 };
export const CARRIER_COST = { credits: 200, industry: 60 };

export const COLONIZATION_FOOD_COST = 20;
export const COLONIZATION_CREDITS_COST = 50;

export const DOMINATION_THRESHOLD = 0.6;
export const SCIENCE_VICTORY_TECH_COUNT = 16;
export const INFLUENCE_VICTORY_THRESHOLD = 80;
export const INFLUENCE_VICTORY_TURNS = 5;
export const ECONOMY_VICTORY_CREDITS_THRESHOLD = 250;
export const ECONOMY_VICTORY_INCOME_THRESHOLD = 35;
export const ECONOMY_VICTORY_TURNS = 5;
export const DIPLOMATIC_PROPOSAL_EXPIRY_TURNS = 10;
export const MAX_PLANET_BUILDING_SLOTS = 8;

export const INFLUENCE_PER_PLANET = 2;
export const INFLUENCE_PER_TURN = 1;
export const INFLUENCE_COLONIZE_COST = 5;
export const INFLUENCE_BUILDING_COST = 3;
export const WAR_DECLARATION_INFLUENCE_COST = 8;

export const CAPITAL_OUTPUT_BONUS = 0.1;
export const SIEGE_OUTPUT_PENALTY = 0.5;
export const WAR_WEARINESS_PER_TURN = 2;
export const TRADE_PACT_CREDITS_PER_TURN = 3;
export const UNREST_APPROVAL_THRESHOLD = 30;
export const BLACK_HOLE_SCIENCE_BONUS = 5;
export const EXPLORATION_SCIENCE_BONUS = 2;
export const ORBITAL_STATION_DEFENSE_BONUS = 10;

export const EMPIRE_COLORS = ['#4a9eff', '#ff4a4a', '#4aff6a', '#ffaa4a', '#aa4aff'];
export const EMPIRE_NAMES = ['Terran Federation', 'Crimson Hegemony', 'Verdant Collective', 'Solar Dominion', 'Void Ascendancy'];
export const EMPIRE_EMBLEMS: EmblemId[] = ['terran', 'crimson', 'verdant', 'solar', 'void'];
export const EMPIRE_TRAITS = ['expansionist', 'scientific', 'militarist'] as const;

export const DREADNOUGHT_COST = { credits: 300, industry: 80 };
export const RARE_RESOURCE_TYPES: Array<'titanium' | 'antimatter' | 'darkmatter'> = ['titanium', 'antimatter', 'darkmatter'];

export const STAR_CLASS_COLORS: Record<string, string> = {
  O: '#9bb0ff',
  B: '#aabfff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4ea',
  K: '#ffd2a1',
  M: '#ffcc6f',
};

export const PLANET_TYPE_INFO = {
  terran: { name: 'Terran', habitability: 1.0, foodMod: 1.2, industryMod: 1.0, scienceMod: 1.0, color: '#4a9e4a' },
  desert: { name: 'Desert', habitability: 0.7, foodMod: 0.6, industryMod: 1.3, scienceMod: 0.8, color: '#c4a035' },
  ocean: { name: 'Ocean', habitability: 0.9, foodMod: 1.1, industryMod: 0.8, scienceMod: 1.1, color: '#3580c4' },
  ice: { name: 'Ice', habitability: 0.5, foodMod: 0.4, industryMod: 0.9, scienceMod: 1.3, color: '#a0d0e8' },
  volcanic: { name: 'Volcanic', habitability: 0.4, foodMod: 0.3, industryMod: 1.5, scienceMod: 0.7, color: '#c44020' },
  gas: { name: 'Gas Giant', habitability: 0, foodMod: 0, industryMod: 0, scienceMod: 0.5, color: '#8866aa' },
  toxic: { name: 'Toxic', habitability: 0.3, foodMod: 0.2, industryMod: 1.1, scienceMod: 1.4, color: '#6a9e3a' },
  barren: { name: 'Barren', habitability: 0.2, foodMod: 0.1, industryMod: 0.8, scienceMod: 0.6, color: '#888888' },
} as const;

export const BUILDING_COSTS: Record<string, { credits: number; industry: number; turns: number }> = {
  farm: { credits: 30, industry: 15, turns: 2 },
  factory: { credits: 40, industry: 25, turns: 3 },
  lab: { credits: 50, industry: 20, turns: 3 },
  spaceport: { credits: 60, industry: 30, turns: 4 },
  defense_grid: { credits: 45, industry: 35, turns: 3 },
  hospital: { credits: 35, industry: 15, turns: 2 },
  mining_complex: { credits: 50, industry: 40, turns: 4 },
  market: { credits: 45, industry: 20, turns: 2 },
  academy: { credits: 55, industry: 25, turns: 3 },
  fortress: { credits: 70, industry: 45, turns: 4 },
  orbital_station: { credits: 100, industry: 60, turns: 5 },
};