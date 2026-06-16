import {
  BLACK_HOLE_SCIENCE_BONUS,
  CAPITAL_OUTPUT_BONUS,
  INFLUENCE_PER_PLANET,
  INFLUENCE_PER_TURN,
  PLANET_TYPE_INFO,
} from './constants';
import { applyBuildingEffects } from './buildings';
import { getLuxuryMoraleBonus } from './planets';
import { getSiegeOutputModifier } from './siege';
import { applyTraitToProduction, getTraitBonuses } from './traits';
import { getEconomicEfficiencyBonus, hasUnlock } from './research';
import { getEconomyMultiplier } from './settings';
import { getSystemSpecializationBonus } from './upkeep';
import type { Empire, GameSettings, Planet, PlanetFocus, Resources, StarSystem, StrategicResources } from './types';

const FOCUS_MODS: Record<PlanetFocus, { food: number; industry: number; science: number }> = {
  balanced: { food: 1, industry: 1, science: 1 },
  food: { food: 1.3, industry: 0.85, science: 0.9 },
  industry: { food: 0.85, industry: 1.3, science: 0.9 },
  science: { food: 0.9, industry: 0.85, science: 1.3 },
};

export function getFocusModifiers(focus: PlanetFocus) {
  return FOCUS_MODS[focus];
}

export function calculatePlanetOutputs(
  planet: Planet,
  empire: Empire,
  system?: StarSystem
): Resources {
  if (!planet.isColonized || planet.ownerId !== empire.id) {
    return { credits: 0, food: 0, industry: 0, science: 0 };
  }

  const popFactor = planet.population / Math.max(planet.maxPopulation, 1);
  const happinessMod = 0.8 + (planet.happiness / 100) * 0.4;
  const approvalMod = 0.9 + (planet.approval / 100) * 0.2;
  let outputMod = happinessMod * approvalMod;

  if (planet.isCapital) outputMod *= 1 + CAPITAL_OUTPUT_BONUS;
  if (system) outputMod *= getSiegeOutputModifier(system);

  const devBonus = 1 + ((planet.developmentLevel ?? 1) - 1) * 0.05;
  outputMod *= devBonus;

  const foodBoost = hasUnlock(empire.researchedTechs, 'food_boost') ? 1.2 : 1;
  const industryBoost = hasUnlock(empire.researchedTechs, 'industry_boost') ? 1.2 : 1;
  const scienceBoost = hasUnlock(empire.researchedTechs, 'science_victory') ? 1.3 : 1;
  const focus = getFocusModifiers(planet.focus);

  const buildingEffects = applyBuildingEffects(planet);
  const specFood = getSystemSpecializationBonus(system?.specialization, 'food');
  const specIndustry = getSystemSpecializationBonus(system?.specialization, 'industry');
  const specScience = getSystemSpecializationBonus(system?.specialization, 'science');
  const specCredits = getSystemSpecializationBonus(system?.specialization, 'credits');

  let science = Math.floor((planet.scienceOutput * popFactor * scienceBoost * focus.science * specScience + buildingEffects.science) * outputMod);

  if (system?.systemType === 'black_hole') {
    science += BLACK_HOLE_SCIENCE_BONUS;
  }

  return {
    food: Math.floor((planet.foodOutput * popFactor * foodBoost * focus.food * specFood + buildingEffects.food) * outputMod),
    industry: Math.floor((planet.industryOutput * popFactor * industryBoost * focus.industry * specIndustry + buildingEffects.industry) * outputMod),
    science,
    credits: Math.floor((planet.minerals * popFactor * 0.5 + planet.energy * popFactor * 0.3 + buildingEffects.credits) * outputMod * specCredits),
  };
}

export function previewStrategicIncome(empire: Empire, systems: StarSystem[]): StrategicResources {
  const preview: StrategicResources = { titanium: 0, antimatter: 0, darkmatter: 0 };
  if (!hasUnlock(empire.researchedTechs, 'strategic_resources')) return preview;

  for (const system of systems) {
    for (const planet of system.planets) {
      if (planet.ownerId !== empire.id || !planet.isColonized) continue;
      if (planet.rareResource === 'none') continue;
      preview[planet.rareResource as keyof StrategicResources] += 1;
    }
  }
  return preview;
}

export function extractStrategicResources(empire: Empire, systems: StarSystem[]): void {
  if (!hasUnlock(empire.researchedTechs, 'strategic_resources')) return;

  for (const system of systems) {
    for (const planet of system.planets) {
      if (planet.ownerId !== empire.id || !planet.isColonized) continue;
      if (planet.rareResource === 'none') continue;

      switch (planet.rareResource) {
        case 'titanium':
          empire.strategicResources.titanium += 1;
          break;
        case 'antimatter':
          empire.strategicResources.antimatter += 1;
          break;
        case 'darkmatter':
          empire.strategicResources.darkmatter += 1;
          break;
      }
    }
  }
}

export function processEmpireEconomy(
  empire: Empire,
  systems: StarSystem[],
  settings?: GameSettings
): Resources {
  const totals: Resources = { credits: 0, food: 0, industry: 0, science: 0 };
  const multiplier = settings ? getEconomyMultiplier(empire, settings) : 1;
  const efficiencyBonus = getEconomicEfficiencyBonus(empire.repeatableTechCounts);

  for (const system of systems) {
    for (const planet of system.planets) {
      if (planet.ownerId === empire.id && planet.isColonized) {
        const outputs = calculatePlanetOutputs(planet, empire, system);
        totals.food += outputs.food;
        totals.industry += outputs.industry;
        totals.science += outputs.science;
        totals.credits += outputs.credits;
      }
    }
  }

  if (hasUnlock(empire.researchedTechs, 'trade')) {
    totals.credits += empire.totalPlanets * 2;
  }
  if (hasUnlock(empire.researchedTechs, 'galactic_market')) {
    totals.credits += empire.totalPlanets * 5;
  }

  const traitAdjusted = applyTraitToProduction(empire, totals);

  return {
    credits: Math.floor(traitAdjusted.credits * multiplier * efficiencyBonus),
    food: Math.floor(traitAdjusted.food * multiplier),
    industry: Math.floor(traitAdjusted.industry * multiplier),
    science: Math.floor(traitAdjusted.science * multiplier),
  };
}

export function updatePlanetHappiness(planet: Planet): void {
  if (!planet.isColonized) return;
  const buildingEffects = applyBuildingEffects(planet);
  const popPressure = planet.population / Math.max(planet.maxPopulation, 1);
  let happiness = 50 + buildingEffects.happiness + getLuxuryMoraleBonus(planet);
  if (popPressure > 0.9) happiness -= 10;
  if (popPressure < 0.3) happiness -= 5;
  planet.happiness = Math.max(0, Math.min(100, happiness));
}

export function updatePlanetApproval(planet: Planet): void {
  if (!planet.isColonized) return;
  const buildingEffects = applyBuildingEffects(planet);
  let approval = 50 + buildingEffects.approval;
  approval += Math.floor((planet.happiness - 50) * 0.3);
  planet.approval = Math.max(0, Math.min(100, approval));
}

export function applyEconomyToEmpire(empire: Empire, systems: StarSystem[], settings?: GameSettings): Resources {
  const production = processEmpireEconomy(empire, systems, settings);
  empire.resources.food += production.food;
  empire.resources.industry += production.industry;
  empire.resources.science += production.science;
  empire.resources.credits += production.credits;

  const traitBonuses = getTraitBonuses(empire.trait);
  empire.influence += INFLUENCE_PER_TURN;
  empire.influence += Math.floor(empire.totalPlanets * INFLUENCE_PER_PLANET * traitBonuses.influenceMod);
  if (hasUnlock(empire.researchedTechs, 'influence_boost')) {
    empire.influence += 3;
  }

  extractStrategicResources(empire, systems);

  for (const system of systems) {
    for (const planet of system.planets) {
      if (planet.ownerId === empire.id && planet.isColonized) {
        updatePlanetHappiness(planet);
        updatePlanetApproval(planet);

        if (planet.population < planet.maxPopulation) {
          const foodCost = Math.ceil(planet.population * 0.5);
          const growthBlocked = planet.happiness < 30 || planet.approval < 25;
          if (!growthBlocked && empire.resources.food >= foodCost) {
            empire.resources.food -= foodCost;
            const growth = Math.max(1, Math.floor(planet.foodOutput * 0.3 * (planet.happiness / 100)));
            planet.population = Math.min(planet.maxPopulation, planet.population + growth);
          }
        }
      }
    }
  }

  return production;
}

export function canColonizePlanet(planet: Planet, empire: Empire, system?: StarSystem): boolean {
  if (system?.systemType === 'black_hole') return false;

  const info = PLANET_TYPE_INFO[planet.type];
  if (info.habitability <= 0) return false;
  if (planet.isColonized) return false;

  if (planet.type === 'desert' || planet.type === 'ice') {
    return hasUnlock(empire.researchedTechs, 'terraform');
  }
  if (planet.type === 'toxic' || planet.type === 'barren') {
    return hasUnlock(empire.researchedTechs, 'planetary_engineering');
  }
  return true;
}

export interface PopulationGrowthPreview {
  growth: number;
  foodCost: number;
  blocked: boolean;
  reason?: string;
}

export function getPopulationGrowthPreview(planet: Planet, empire: Empire): PopulationGrowthPreview {
  if (!planet.isColonized || planet.ownerId !== empire.id) {
    return { growth: 0, foodCost: 0, blocked: true, reason: 'Not owned' };
  }
  if (planet.population >= planet.maxPopulation) {
    return { growth: 0, foodCost: 0, blocked: true, reason: 'At capacity' };
  }

  const foodCost = Math.ceil(planet.population * 0.5);
  const growthBlocked = planet.happiness < 30 || planet.approval < 25;
  if (growthBlocked) {
    return { growth: 0, foodCost, blocked: true, reason: 'Low morale' };
  }

  const growth = Math.max(1, Math.floor(planet.foodOutput * 0.3 * (planet.happiness / 100)));
  if (empire.resources.food < foodCost) {
    return { growth: 0, foodCost, blocked: true, reason: 'Insufficient food' };
  }

  return { growth, foodCost, blocked: false };
}

export function countEmpirePlanets(empireId: string, systems: StarSystem[]): number {
  let count = 0;
  for (const system of systems) {
    for (const planet of system.planets) {
      if (planet.ownerId === empireId && planet.isColonized) count++;
    }
  }
  return count;
}