import { createDecision } from './playerDecisions';
import { SeededRNG } from './rng';
import type { Empire, EventChainState, GameState } from './types';

interface RandomEvent {
  id: string;
  name: string;
  message: (empire: Empire) => string;
  apply: (empire: Empire, rng: SeededRNG, state?: GameState) => void;
  weight: number;
}

interface EventChainDefinition {
  id: string;
  name: string;
  steps: { message: string; apply: (empire: Empire) => void }[];
  turnsBetweenSteps: number;
}

const RANDOM_EVENTS: RandomEvent[] = [
  {
    id: 'economic_boom',
    name: 'Economic Boom',
    message: e => `${e.name}: Economic boom increases trade revenue!`,
    apply: (e) => { e.resources.credits += 25; },
    weight: 3,
  },
  {
    id: 'harvest_festival',
    name: 'Harvest Festival',
    message: e => `${e.name}: Bountiful harvest across colonies!`,
    apply: (e) => { e.resources.food += 20; },
    weight: 3,
  },
  {
    id: 'industrial_surge',
    name: 'Industrial Surge',
    message: e => `${e.name}: Industrial production surges!`,
    apply: (e) => { e.resources.industry += 15; },
    weight: 3,
  },
  {
    id: 'scientific_breakthrough',
    name: 'Scientific Breakthrough',
    message: e => `${e.name}: Unexpected scientific breakthrough!`,
    apply: (e) => { e.resources.science += 12; e.researchProgress += 5; },
    weight: 2,
  },
  {
    id: 'drought',
    name: 'Drought',
    message: e => `${e.name}: Severe drought reduces food stores.`,
    apply: (e) => { e.resources.food = Math.max(0, e.resources.food - 15); },
    weight: 2,
  },
  {
    id: 'pirate_raid',
    name: 'Pirate Raid',
    message: e => `${e.name}: Pirates raid trade convoys!`,
    apply: (e) => { e.resources.credits = Math.max(0, e.resources.credits - 20); },
    weight: 2,
  },
  {
    id: 'worker_strike',
    name: 'Worker Strike',
    message: e => `${e.name}: Worker strikes slow industry.`,
    apply: (e) => { e.resources.industry = Math.max(0, e.resources.industry - 10); },
    weight: 2,
  },
  {
    id: 'cultural_renaissance',
    name: 'Cultural Renaissance',
    message: e => `${e.name}: Cultural renaissance boosts influence!`,
    apply: (e) => { e.influence += 5; },
    weight: 2,
  },
  {
    id: 'refugee_wave',
    name: 'Refugee Wave',
    message: e => `${e.name}: Refugees arrive seeking new homes.`,
    apply: (e, rng) => {
      if (e.totalPlanets > 0) {
        e.resources.food -= 5;
        e.influence += rng.nextInt(2, 4);
      }
    },
    weight: 1,
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    message: e => `${e.name}: Solar flare disrupts communications.`,
    apply: (e) => { e.resources.science = Math.max(0, e.resources.science - 8); },
    weight: 1,
  },
  {
    id: 'mineral_discovery',
    name: 'Mineral Discovery',
    message: e => `${e.name}: Rich mineral veins discovered!`,
    apply: (e) => { e.resources.industry += 20; e.strategicResources.titanium += 1; },
    weight: 2,
  },
  {
    id: 'diplomatic_summit',
    name: 'Diplomatic Summit',
    message: e => `${e.name}: Diplomatic summit boosts relations.`,
    apply: (e) => { e.influence += 8; },
    weight: 2,
  },
  {
    id: 'plague_outbreak',
    name: 'Plague Outbreak',
    message: e => `${e.name}: Plague outbreak reduces population morale.`,
    apply: (e) => { e.resources.food = Math.max(0, e.resources.food - 10); },
    weight: 1,
  },
  {
    id: 'trade_windfall',
    name: 'Trade Windfall',
    message: e => `${e.name}: Favorable trade winds bring windfall profits!`,
    apply: (e) => { e.resources.credits += 35; },
    weight: 2,
  },
  {
    id: 'antimatter_find',
    name: 'Antimatter Discovery',
    message: e => `${e.name}: Trace antimatter detected in deep space!`,
    apply: (e) => { e.strategicResources.antimatter += 1; e.resources.science += 10; },
    weight: 1,
  },
];

const PLAYER_CHOICE_EVENTS: RandomEvent[] = [
  {
    id: 'frontier_beacon',
    name: 'Frontier Beacon',
    message: e => `${e.name}: A frontier beacon requests survey directives.`,
    apply: (e, _rng, state) => {
      if (!e.isPlayer || !state) return;
      createDecision(
        state,
        e.id,
        'frontier_survey',
        'Frontier Beacon Survey',
        'Scout teams report an uncharted beacon on the rim. How should your empire respond?'
      );
    },
    weight: 2,
  },
  {
    id: 'rim_expedition',
    name: 'Rim Expedition',
    message: e => `${e.name}: Rim expedition awaits orders.`,
    apply: (e, _rng, state) => {
      if (!e.isPlayer || !state) return;
      createDecision(
        state,
        e.id,
        'frontier_survey',
        'Rim Expedition Briefing',
        'Explorers mapped a promising frontier sector. Choose how to capitalize on the findings.'
      );
    },
    weight: 2,
  },
];

const EVENT_CHAINS: EventChainDefinition[] = [
  {
    id: 'ancient_signal',
    name: 'Ancient Signal Chain',
    turnsBetweenSteps: 2,
    steps: [
      { message: 'Strange signal detected from deep space...', apply: e => { e.resources.science += 5; } },
      { message: 'Signal decoded — coordinates to unknown sector revealed.', apply: e => { e.influence += 3; } },
      { message: 'Precursor cache discovered! Massive science windfall.', apply: e => { e.resources.science += 25; e.resources.credits += 30; } },
    ],
  },
  {
    id: 'colonial_unrest',
    name: 'Colonial Unrest Chain',
    turnsBetweenSteps: 1,
    steps: [
      { message: 'Rumors of unrest spread across outer colonies.', apply: () => {} },
      { message: 'Protests erupt — approval drops empire-wide.', apply: e => { e.resources.credits -= 10; } },
      { message: 'Unrest quelled with concessions. Stability restored.', apply: e => { e.influence += 5; e.resources.food += 10; } },
    ],
  },
  {
    id: 'trade_expansion',
    name: 'Trade Expansion Chain',
    turnsBetweenSteps: 2,
    steps: [
      { message: 'Merchant guilds propose new trade routes.', apply: e => { e.resources.credits += 10; } },
      { message: 'Trade convoys establish interstellar routes.', apply: e => { e.resources.credits += 15; } },
      { message: 'Galactic trade hub established! Permanent revenue boost.', apply: e => { e.resources.credits += 40; e.influence += 8; } },
    ],
  },
];

export function trimEventLog(state: GameState, maxEvents = 100): void {
  if (state.events.length > maxEvents) {
    state.events = state.events.slice(-maxEvents);
  }
}

export function startEventChain(state: GameState, chainId: string, empireId: string): void {
  const chain = EVENT_CHAINS.find(c => c.id === chainId);
  if (!chain) return;
  state.activeEventChains = state.activeEventChains ?? [];
  if (state.activeEventChains.some(c => c.chainId === chainId && c.empireId === empireId)) return;
  state.activeEventChains.push({
    chainId,
    empireId,
    step: 0,
    turnsRemaining: 0,
  });
}

export function processEventChains(state: GameState): void {
  state.activeEventChains = state.activeEventChains ?? [];
  const remaining: EventChainState[] = [];

  for (const active of state.activeEventChains) {
    const chain = EVENT_CHAINS.find(c => c.id === active.chainId);
    const empire = state.empires.find(e => e.id === active.empireId);
    if (!chain || !empire?.isAlive) continue;

    if (active.turnsRemaining > 0) {
      active.turnsRemaining--;
      remaining.push(active);
      continue;
    }

    if (active.step < chain.steps.length) {
      const step = chain.steps[active.step];
      step.apply(empire);
      state.events.push({
        turn: state.turn,
        type: 'event',
        message: `${empire.name}: ${step.message}`,
      });
      active.step++;
      if (active.step < chain.steps.length) {
        active.turnsRemaining = chain.turnsBetweenSteps;
        remaining.push(active);
      }
    }
  }

  state.activeEventChains = remaining;
}

export function processRandomEvents(state: GameState, rng: SeededRNG): void {
  for (const empire of state.empires) {
    if (!empire.isAlive || empire.isPirate) continue;

    if (empire.isPlayer && rng.next() < 0.08) {
      const pool = PLAYER_CHOICE_EVENTS;
      const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
      let roll = rng.next() * totalWeight;
      let chosen = pool[0];
      for (const event of pool) {
        roll -= event.weight;
        if (roll <= 0) {
          chosen = event;
          break;
        }
      }
      chosen.apply(empire, rng, state);
      state.events.push({
        turn: state.turn,
        type: 'event',
        message: chosen.message(empire),
      });
      continue;
    }

    if (rng.next() < 0.05) {
      const chain = rng.pick(EVENT_CHAINS);
      startEventChain(state, chain.id, empire.id);
      state.events.push({
        turn: state.turn,
        type: 'event',
        message: `${empire.name}: ${chain.name} begins...`,
      });
      continue;
    }

    if (rng.next() > 0.15) continue;

    const totalWeight = RANDOM_EVENTS.reduce((sum, e) => sum + e.weight, 0);
    let roll = rng.next() * totalWeight;
    let chosen = RANDOM_EVENTS[0];
    for (const event of RANDOM_EVENTS) {
      roll -= event.weight;
      if (roll <= 0) {
        chosen = event;
        break;
      }
    }

    chosen.apply(empire, rng, state);
    state.events.push({
      turn: state.turn,
      type: 'event',
      message: chosen.message(empire),
    });
  }
}