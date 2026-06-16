import {
  BLOCKER_HABITABILITY_PENALTY,
  LUXURY_MORALE_BONUS,
  QUALITY_OUTPUT_MODS,
  TERRAFORMING_COST_INDUSTRY,
  TERRAFORMING_TURNS,
} from './constants';
import { hasUnlock } from './research';
import { SeededRNG } from './rng';
import type {
  Empire,
  Planet,
  PlanetBlocker,
  PlanetModifier,
  PlanetQualityTier,
  LuxuryResource,
} from './types';

const QUALITY_WEIGHTS: { tier: PlanetQualityTier; weight: number }[] = [
  { tier: 'poor', weight: 2 },
  { tier: 'average', weight: 5 },
  { tier: 'rich', weight: 2 },
  { tier: 'exceptional', weight: 1 },
];

const BLOCKER_TYPES: PlanetBlocker[] = ['radiation', 'tectonic', 'toxic_atmosphere'];
const MODIFIER_TYPES: PlanetModifier[] = ['mineral_rich', 'fertile', 'unstable', 'ancient_cities'];
const LUXURY_TYPES: LuxuryResource[] = ['crystals', 'spices'];

export function pickPlanetQuality(rng: SeededRNG): PlanetQualityTier {
  const total = QUALITY_WEIGHTS.reduce((s, q) => s + q.weight, 0);
  let roll = rng.next() * total;
  for (const q of QUALITY_WEIGHTS) {
    roll -= q.weight;
    if (roll <= 0) return q.tier;
  }
  return 'average';
}

export function pickPlanetBlockers(rng: SeededRNG): PlanetBlocker[] {
  if (rng.next() > 0.4) return [];
  const count = rng.next() < 0.7 ? 1 : 2;
  const blockers: PlanetBlocker[] = [];
  const pool = rng.shuffle([...BLOCKER_TYPES]);
  for (let i = 0; i < count && i < pool.length; i++) {
    blockers.push(pool[i]);
  }
  return blockers;
}

export function pickPlanetModifiers(rng: SeededRNG): PlanetModifier[] {
  if (rng.next() > 0.35) return [];
  return [rng.pick(MODIFIER_TYPES)];
}

export function pickLuxuryResource(rng: SeededRNG): LuxuryResource | 'none' {
  return rng.next() < 0.12 ? rng.pick(LUXURY_TYPES) : 'none';
}

export function getQualityOutputMod(quality: PlanetQualityTier = 'average'): number {
  return QUALITY_OUTPUT_MODS[quality];
}

export function getBlockerPenalty(blockers: PlanetBlocker[] = []): number {
  return 1 - blockers.length * BLOCKER_HABITABILITY_PENALTY;
}

export function getModifierBonuses(modifiers: PlanetModifier[] = []): {
  food: number;
  industry: number;
  science: number;
  credits: number;
  happiness: number;
} {
  const bonuses = { food: 0, industry: 0, science: 0, credits: 0, happiness: 0 };
  for (const mod of modifiers) {
    switch (mod) {
      case 'mineral_rich':
        bonuses.industry += 2;
        bonuses.credits += 1;
        break;
      case 'fertile':
        bonuses.food += 2;
        bonuses.happiness += 3;
        break;
      case 'unstable':
        bonuses.industry += 1;
        bonuses.happiness -= 2;
        break;
      case 'ancient_cities':
        bonuses.science += 2;
        bonuses.credits += 2;
        break;
    }
  }
  return bonuses;
}

export function applyPlanetFeatureOutputs(planet: Planet): void {
  const qualityMod = getQualityOutputMod(planet.quality);
  const blockerMod = getBlockerPenalty(planet.blockers);
  const modBonuses = getModifierBonuses(planet.modifiers);

  planet.foodOutput = Math.floor((planet.foodOutput * qualityMod * blockerMod) + modBonuses.food);
  planet.industryOutput = Math.floor((planet.industryOutput * qualityMod * blockerMod) + modBonuses.industry);
  planet.scienceOutput = Math.floor((planet.scienceOutput * qualityMod * blockerMod) + modBonuses.science);
  planet.minerals = Math.floor(planet.minerals * qualityMod + modBonuses.credits);
}

export function getLuxuryMoraleBonus(planet: Planet): number {
  return planet.luxuryResource && planet.luxuryResource !== 'none' ? LUXURY_MORALE_BONUS : 0;
}

export function canTerraformPlanet(planet: Planet, empire: Empire): string | null {
  if (!planet.isColonized || planet.ownerId !== empire.id) return 'Planet not owned';
  if (!hasUnlock(empire.researchedTechs, 'terraform')) return 'Requires terraforming tech';
  if ((planet.blockers?.length ?? 0) === 0 && (planet.terraformingProgress ?? 0) >= TERRAFORMING_TURNS) {
    return 'Already terraformed';
  }
  if (empire.resources.industry < TERRAFORMING_COST_INDUSTRY) return 'Not enough industry';
  return null;
}

export function terraformPlanet(planet: Planet, empire: Empire): boolean {
  const err = canTerraformPlanet(planet, empire);
  if (err) return false;

  empire.resources.industry -= TERRAFORMING_COST_INDUSTRY;
  planet.terraformingProgress = (planet.terraformingProgress ?? 0) + 1;

  if (planet.terraformingProgress >= TERRAFORMING_TURNS) {
    planet.blockers = [];
    planet.foodOutput += 1;
    planet.industryOutput += 1;
    planet.maxPopulation = Math.floor(planet.maxPopulation * 1.15);
    planet.happiness = Math.min(100, planet.happiness + 10);
  }
  return true;
}

export function clearBlocker(planet: Planet, blocker: PlanetBlocker): void {
  if (!planet.blockers) return;
  planet.blockers = planet.blockers.filter(b => b !== blocker);
}

export function migratePlanetFeatures(planet: Planet): Planet {
  return {
    ...planet,
    quality: planet.quality ?? 'average',
    blockers: planet.blockers ?? [],
    modifiers: planet.modifiers ?? [],
    luxuryResource: planet.luxuryResource ?? 'none',
    developmentLevel: planet.developmentLevel ?? 1,
    terraformingProgress: planet.terraformingProgress ?? 0,
  };
}