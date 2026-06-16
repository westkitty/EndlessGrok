import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn, serializeGame } from '../game';
import {
  SAVE_SCHEMA_VERSION,
  SAVE_GAME_ID,
  createVersionedSaveFile,
  detectSaveFormat,
  extractSerializedState,
  migrateLegacySerializedState,
  parseAndHydrateSave,
  parseSaveJson,
  sanitizeLoadedGameState,
  validateVersionedSave,
} from '../saveFormat';
import { exportSaveToJson, importSaveFromJson } from '../save';
import type { SerializedGameState } from '../types';

function cloneState(state: ReturnType<typeof createNewGame>) {
  return structuredClone(state);
}

describe('save format versioning', () => {
  it('creates versioned save payload with required envelope fields', () => {
    const game = createNewGame(42);
    const json = exportSaveToJson(game);
    const parsed = JSON.parse(json);

    expect(parsed.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(parsed.gameId).toBe(SAVE_GAME_ID);
    expect(typeof parsed.savedAt).toBe('string');
    expect(parsed.state.seed).toBe(42);
    expect(parsed.state.saveMetadata?.turn).toBe(game.turn);
  });

  it('loads current version saves and preserves gameplay state', () => {
    const game = createNewGame(88, { empireCount: 3 });
    const planet = game.systems[0].planets[0];
    game.colonizationProjects = [{
      id: 'colonize-1',
      planetId: planet.id,
      systemId: planet.systemId,
      empireId: game.playerEmpireId,
      turnsRemaining: 1,
      totalTurns: 2,
      usedColonyShip: false,
    }];
    game.turn = 7;

    const json = exportSaveToJson(game);
    const loaded = parseAndHydrateSave(JSON.parse(json));
    expect(loaded.error).toBeNull();
    expect(loaded.state?.seed).toBe(88);
    expect(loaded.state?.turn).toBe(7);
    expect(loaded.state?.colonizationProjects).toHaveLength(1);
    expect(loaded.state?.empires).toHaveLength(3);
    expect(loaded.state?.fleets.length).toBe(game.fleets.length);

    const afterTurn = endTurn(cloneState(loaded.state!));
    expect(afterTurn.turn).toBe(8);
  });

  it('loads legacy unversioned saves', () => {
    const game = createNewGame(55);
    game.turn = 3;
    const legacy = serializeGame(game) as SerializedGameState;

    expect(detectSaveFormat(legacy)).toBe('legacy');

    const loaded = parseAndHydrateSave(legacy);
    expect(loaded.error).toBeNull();
    expect(loaded.state?.seed).toBe(55);
    expect(loaded.state?.turn).toBe(3);
    expect(loaded.state?.empires[0].knownSystems.size).toBeGreaterThan(0);
  });

  it('migrates legacy serialized state defaults', () => {
    const game = createNewGame(12);
    const legacy = serializeGame(game);
    delete (legacy as Partial<SerializedGameState>).colonizationProjects;
    delete (legacy as Partial<SerializedGameState>).pendingDecisions;

    const migrated = migrateLegacySerializedState(legacy);
    expect(migrated.colonizationProjects).toEqual([]);
    expect(migrated.pendingDecisions).toEqual([]);
  });

  it('rejects malformed save JSON', () => {
    const bad = parseSaveJson('{not valid json');
    expect(bad.error).toBeTruthy();

    const loaded = parseAndHydrateSave({ turn: 1 });
    expect(loaded.state).toBeNull();
    expect(loaded.error).toContain('Invalid');
  });

  it('rejects unsupported future schema versions', () => {
    const game = createNewGame(1);
    const envelope = createVersionedSaveFile(serializeGame(game));
    envelope.schemaVersion = SAVE_SCHEMA_VERSION + 5;

    const result = extractSerializedState(envelope);
    expect(result.error).toContain('only supports');
    expect(result.serialized).toBeNull();
  });

  it('rejects saves from other games', () => {
    const game = createNewGame(1);
    const envelope = createVersionedSaveFile(serializeGame(game));
    envelope.gameId = 'other-game';

    const err = validateVersionedSave(envelope);
    expect(err).toContain('not from Endless Grok');
  });

  it('sanitizes invalid UI selection references after load', () => {
    const game = createNewGame(99);
    game.selectedSystemId = 'missing-system';
    game.selectedFleetId = 'missing-fleet';

    const loaded = sanitizeLoadedGameState(
      parseAndHydrateSave(serializeGame(game)).state!
    );
    expect(loaded.selectedSystemId).toBeNull();
    expect(loaded.selectedFleetId).toBeNull();
  });

  it('import/export round-trip uses versioned envelope', () => {
    const game = createNewGame(77);
    const result = importSaveFromJson(exportSaveToJson(game));
    expect(result.error).toBeNull();
    expect(result.state?.seed).toBe(77);
  });
});