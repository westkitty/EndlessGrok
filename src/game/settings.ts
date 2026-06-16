import {
  DIFFICULTY_SETTINGS,
  GALAXY_SIZE_OPTIONS,
  MAX_TURNS,
  STARTING_CREDITS,
  STARTING_FOOD,
  STARTING_INDUSTRY,
  STARTING_INFLUENCE,
  STARTING_SCIENCE,
} from './constants';
import type { Difficulty, Empire, GalaxySizeOption, GalaxyShape, GameSettings } from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'normal',
  galaxySize: 'medium',
  galaxyShape: 'spiral',
  maxTurns: MAX_TURNS,
  empireCount: 2,
};

export function createGameSettings(overrides?: Partial<GameSettings>): GameSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

export function getGalaxyConfig(size: GalaxySizeOption) {
  return GALAXY_SIZE_OPTIONS[size];
}

export function applyDifficultyToEmpire(empire: Empire, difficulty: Difficulty, isPlayer: boolean): void {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const bonus = isPlayer ? settings.playerResourceBonus : settings.aiResourceBonus;
  const creditBonus = isPlayer ? settings.startingCreditsBonus : 0;

  empire.resources.credits = Math.floor((STARTING_CREDITS + creditBonus) * bonus);
  empire.resources.food = Math.floor(STARTING_FOOD * bonus);
  empire.resources.industry = Math.floor(STARTING_INDUSTRY * bonus);
  empire.resources.science = Math.floor(STARTING_SCIENCE * bonus);
  empire.influence = STARTING_INFLUENCE;
}

export function getDifficultyModifiers(difficulty: Difficulty) {
  return DIFFICULTY_SETTINGS[difficulty];
}

export function getEconomyMultiplier(empire: Empire, settings: GameSettings): number {
  const mods = DIFFICULTY_SETTINGS[settings.difficulty];
  return empire.isPlayer ? mods.playerResourceBonus : mods.aiResourceBonus;
}

export const GALAXY_SHAPE_DESCRIPTIONS: Record<GalaxyShape, string> = {
  spiral: 'Three-arm spiral — classic exploration lanes with balanced connectivity.',
  cluster: 'Four dense clusters — close neighbors, fierce early competition.',
  ring: 'Ring formation — empires spread along a galactic hoop.',
  elliptical: 'Elliptical disk — elongated frontiers and long border lines.',
  sparse: 'Sparse scatter — wide gaps, slower expansion, more unknowns.',
};