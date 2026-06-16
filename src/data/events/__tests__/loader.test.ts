import { describe, it, expect } from 'vitest';
import {
  loadEventDefinitions,
  getEventDefinitionById,
  getEventsByCategory,
  validateAllEventDefinitions,
} from '../loader';
import { materializeEventLogEntry } from '../materialize';
import { getAssetById as getManifestAssetById } from '../../assets/runtimeManifest';

describe('event definition loader', () => {
  it('loads JSON event definitions', () => {
    const defs = loadEventDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(12);
  });

  it('finds events by id and category', () => {
    expect(getEventDefinitionById('event-victory-heliocide-confirmation')).toBeDefined();
    expect(getEventsByCategory('starbinding').length).toBeGreaterThan(0);
  });

  it('validates all definitions', () => {
    expect(validateAllEventDefinitions()).toEqual([]);
  });

  it('materializes into game event log shape', () => {
    const def = getEventDefinitionById('event-victory-heliocide-confirmation');
    expect(def).toBeDefined();
    const entry = materializeEventLogEntry(def!, 3);
    expect(entry.eventDefinitionId).toBe('event-victory-heliocide-confirmation');
    expect(entry.type).toBe('heliocide');
    expect(entry.message).toContain('Heliocide');
  });

  it('related assets resolve or exist in manifest', () => {
    for (const def of loadEventDefinitions()) {
      for (const assetId of def.relatedAssetIds) {
        const resolved = getManifestAssetById(assetId);
        expect(resolved, `missing manifest asset for ${assetId} in ${def.id}`).toBeDefined();
      }
    }
  });
});