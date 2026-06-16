import type { Empire, EmpireTrait, Resources } from './types';

export interface TraitBonuses {
  colonizeCostMod: number;
  scienceMod: number;
  militaryAttackMod: number;
  influenceMod: number;
  expansionMod: number;
}

const TRAIT_BONUSES: Record<EmpireTrait, TraitBonuses> = {
  expansionist: {
    colonizeCostMod: 0.8,
    scienceMod: 1.0,
    militaryAttackMod: 1.0,
    influenceMod: 1.15,
    expansionMod: 1.2,
  },
  scientific: {
    colonizeCostMod: 1.0,
    scienceMod: 1.2,
    militaryAttackMod: 1.0,
    influenceMod: 1.0,
    expansionMod: 1.0,
  },
  militarist: {
    colonizeCostMod: 1.0,
    scienceMod: 1.0,
    militaryAttackMod: 1.15,
    influenceMod: 1.0,
    expansionMod: 1.0,
  },
};

export function getTraitBonuses(trait: EmpireTrait): TraitBonuses {
  return TRAIT_BONUSES[trait];
}

export function applyTraitToProduction(empire: Empire, production: Resources): Resources {
  const bonuses = getTraitBonuses(empire.trait);
  return {
    credits: production.credits,
    food: production.food,
    industry: production.industry,
    science: Math.floor(production.science * bonuses.scienceMod),
  };
}

export function getTraitDescription(trait: EmpireTrait): string {
  switch (trait) {
    case 'expansionist': return '+15% influence, -20% colonize cost, faster expansion';
    case 'scientific': return '+20% science output';
    case 'militarist': return '+15% fleet attack power';
  }
}

export function getTraitName(trait: EmpireTrait): string {
  return trait.charAt(0).toUpperCase() + trait.slice(1);
}