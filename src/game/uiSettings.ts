export type UIScale = 0.9 | 1 | 1.1;

import type { GalaxyShape } from './types';

export interface UISettings {
  animationsEnabled: boolean;
  uiScale: UIScale;
  scanlinesEnabled: boolean;
  /** Placeholder — audio system not implemented */
  soundEnabled: boolean;
  defaultGalaxyShape: GalaxyShape;
}

const STORAGE_KEY = 'endlessgrok-ui-settings';

export const DEFAULT_UI_SETTINGS: UISettings = {
  animationsEnabled: true,
  uiScale: 1,
  scanlinesEnabled: false,
  soundEnabled: false,
  defaultGalaxyShape: 'spiral',
};

export function loadUISettings(): UISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_UI_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UISettings>;
    return {
      animationsEnabled: parsed.animationsEnabled ?? DEFAULT_UI_SETTINGS.animationsEnabled,
      uiScale: (parsed.uiScale === 0.9 || parsed.uiScale === 1.1 ? parsed.uiScale : 1) as UIScale,
      scanlinesEnabled: parsed.scanlinesEnabled ?? DEFAULT_UI_SETTINGS.scanlinesEnabled,
      soundEnabled: parsed.soundEnabled ?? DEFAULT_UI_SETTINGS.soundEnabled,
      defaultGalaxyShape: (parsed.defaultGalaxyShape as GalaxyShape) ?? DEFAULT_UI_SETTINGS.defaultGalaxyShape,
    };
  } catch {
    return { ...DEFAULT_UI_SETTINGS };
  }
}

export function saveUISettings(settings: UISettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}