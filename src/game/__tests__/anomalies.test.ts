import { describe, it, expect } from 'vitest';
import { generateAnomaly, shouldGenerateAnomaly, getAnomalyRewardPreview } from '../anomalies';
import { SeededRNG } from '../rng';

describe('Anomalies', () => {
  it('generates valid anomalies', () => {
    const rng = new SeededRNG(42);
    const anomaly = generateAnomaly(rng);
    expect(anomaly.id).toBeTruthy();
    expect(anomaly.name).toBeTruthy();
    expect(anomaly.explored).toBe(false);
  });

  it('has reward previews for all types', () => {
    const types = ['derelict', 'nebula', 'asteroid_field', 'ancient_ruins', 'wormhole', 'resource_cache'] as const;
    for (const type of types) {
      expect(getAnomalyRewardPreview(type).length).toBeGreaterThan(0);
    }
  });

  it('generates anomalies probabilistically', () => {
    const rng = new SeededRNG(123);
    let count = 0;
    for (let i = 0; i < 100; i++) {
      if (shouldGenerateAnomaly(rng)) count++;
    }
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(100);
  });
});