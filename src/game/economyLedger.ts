import { calculatePlanetOutputs } from './economy';
import { calculateFleetUpkeep, calculateBuildingMaintenance } from './upkeep';
import { TRADE_PACT_CREDITS_PER_TURN } from './constants';
import type { Empire, GameState, Resources } from './types';

export interface ResourceLedger {
  planets: Resources;
  trade: Resources;
  upkeep: Resources & { fleet: number; buildings: number };
  events: Resources;
  net: Resources;
}

export function computeEmpireLedger(state: GameState, empire: Empire): ResourceLedger {
  const planets: Resources = { credits: 0, food: 0, industry: 0, science: 0 };

  for (const system of state.systems) {
    for (const planet of system.planets) {
      if (planet.ownerId !== empire.id) continue;
      const output = calculatePlanetOutputs(planet, empire, system);
      planets.credits += output.credits;
      planets.food += output.food;
      planets.industry += output.industry;
      planets.science += output.science;
    }
  }

  let tradeCredits = 0;
  for (const [, dip] of Object.entries(empire.diplomacy)) {
    if (dip === 'trade') tradeCredits += TRADE_PACT_CREDITS_PER_TURN;
  }

  const fleetUpkeep = calculateFleetUpkeep(state.fleets.filter(f => f.empireId === empire.id));
  const maintenance = calculateBuildingMaintenance(state.systems, empire.id);

  const net: Resources = {
    credits: planets.credits + tradeCredits - fleetUpkeep - maintenance,
    food: planets.food,
    industry: planets.industry,
    science: planets.science,
  };

  return {
    planets,
    trade: { credits: tradeCredits, food: 0, industry: 0, science: 0 },
    upkeep: { credits: fleetUpkeep + maintenance, food: 0, industry: 0, science: 0, fleet: fleetUpkeep, buildings: maintenance },
    events: { credits: 0, food: 0, industry: 0, science: 0 },
    net,
  };
}