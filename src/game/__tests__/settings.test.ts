import { describe, it, expect } from 'vitest';
import { createGameSettings, getGalaxyConfig, applyDifficultyToEmpire } from '../settings';
import { createEmpire } from '../defaults';
import type { Empire } from '../types';

describe('Settings', () => {
  it('creates default settings', () => {
    const settings = createGameSettings();
    expect(settings.difficulty).toBe('normal');
    expect(settings.galaxySize).toBe('medium');
  });

  it('applies overrides', () => {
    const settings = createGameSettings({ difficulty: 'hard', galaxySize: 'large' });
    expect(settings.difficulty).toBe('hard');
    expect(settings.galaxySize).toBe('large');
  });

  it('returns galaxy config by size', () => {
    expect(getGalaxyConfig('small').systemCount).toBe(16);
    expect(getGalaxyConfig('large').systemCount).toBe(36);
    expect(getGalaxyConfig('huge').systemCount).toBe(48);
  });

  it('applies difficulty to empire', () => {
    const empire: Empire = createEmpire('e', 'T', '#fff', true);
    applyDifficultyToEmpire(empire, 'easy', true);
    expect(empire.resources.credits).toBeGreaterThan(0);
    expect(empire.influence).toBeGreaterThan(0);
  });
});