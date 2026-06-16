import { deserializeGame } from './game';
import type { GameState, SerializedGameState } from './types';

import { createDefaultShipDesigns } from './shipDesigns';

/** Increment when the on-disk save envelope or serialized state shape changes. */
export const SAVE_SCHEMA_VERSION = 2;

export const SAVE_GAME_ID = 'endlessgrok';

export const LEGACY_SAVE_SCHEMA_VERSION = 0;

export interface VersionedSaveFile {
  schemaVersion: number;
  gameId: string;
  savedAt: string;
  state: SerializedGameState;
}

export type SaveFormatKind = 'legacy' | 'versioned' | 'invalid';

export function detectSaveFormat(data: unknown): SaveFormatKind {
  if (!data || typeof data !== 'object') return 'invalid';
  const obj = data as Record<string, unknown>;
  if (typeof obj.schemaVersion === 'number' && obj.state && typeof obj.state === 'object') {
    return 'versioned';
  }
  if (
    typeof obj.seed === 'number' &&
    Array.isArray(obj.empires) &&
    Array.isArray(obj.systems) &&
    Array.isArray(obj.fleets)
  ) {
    return 'legacy';
  }
  return 'invalid';
}

export function validateSerializedState(state: unknown): string | null {
  if (!state || typeof state !== 'object') return 'Invalid save file format.';
  const s = state as Record<string, unknown>;
  if (typeof s.seed !== 'number') return 'Invalid save file format.';
  if (!Array.isArray(s.empires)) return 'Invalid save file format.';
  if (!Array.isArray(s.systems)) return 'Invalid save file format.';
  if (!Array.isArray(s.fleets)) return 'Invalid save file format.';
  if (typeof s.playerEmpireId !== 'string') return 'Invalid save file format.';
  if (!s.empires.some((e: { id?: string }) => e?.id === s.playerEmpireId)) {
    return 'Invalid save file format.';
  }
  return null;
}

export function validateVersionedSave(data: VersionedSaveFile): string | null {
  if (typeof data.schemaVersion !== 'number') return 'Save file is missing schema version.';
  if (data.schemaVersion > SAVE_SCHEMA_VERSION) {
    return `This save requires schema version ${data.schemaVersion}, but this build only supports up to ${SAVE_SCHEMA_VERSION}. Please update Endless Grok.`;
  }
  if (data.schemaVersion < 1) return 'Unsupported save schema version.';
  if (data.gameId !== SAVE_GAME_ID) return 'This save file is not from Endless Grok.';
  if (typeof data.savedAt !== 'string' || !data.savedAt) return 'Save file is missing timestamp.';
  return validateSerializedState(data.state);
}

/** Normalize legacy unversioned payloads before hydration. */
export function migrateLegacySerializedState(data: SerializedGameState): SerializedGameState {
  return {
    ...data,
    turnSummaries: data.turnSummaries ?? [],
    diplomaticProposals: data.diplomaticProposals ?? [],
    colonizationProjects: data.colonizationProjects ?? [],
    pendingDecisions: data.pendingDecisions ?? [],
    activeEventChains: data.activeEventChains ?? [],
    piratesSpawned: data.piratesSpawned ?? false,
    pirateEmpireId: data.pirateEmpireId ?? null,
    crisisWarned: data.crisisWarned ?? false,
    lastAutosaveTurn: data.lastAutosaveTurn ?? 0,
    precursorLorePending: data.precursorLorePending ?? null,
  };
}

type SerializedMigration = (state: SerializedGameState) => SerializedGameState;

function migrateSerializedV1ToV2(state: SerializedGameState): SerializedGameState {
  const defaultDesigns = createDefaultShipDesigns();
  return {
    ...state,
    empires: state.empires.map(empire => ({
      ...empire,
      shipDesigns: empire.shipDesigns ?? defaultDesigns,
      activeResearchStrategicSpent: empire.activeResearchStrategicSpent,
      queuedResearchStrategicSpent: empire.queuedResearchStrategicSpent,
    })),
    fleets: state.fleets.map(fleet => ({
      ...fleet,
      ships: fleet.ships.map(ship => ({
        ...ship,
        designId: ship.designId ?? `default-${ship.type}`,
      })),
    })),
  };
}

/** Dispatcher for serialized-state migrations between schema versions. */
const SERIALIZED_STATE_MIGRATIONS: Partial<Record<number, SerializedMigration>> = {
  2: migrateSerializedV1ToV2,
};

export function migrateSerializedState(
  state: SerializedGameState,
  fromVersion: number,
): SerializedGameState {
  let current = fromVersion === LEGACY_SAVE_SCHEMA_VERSION
    ? migrateLegacySerializedState(state)
    : state;

  for (let version = Math.max(fromVersion, 1) + 1; version <= SAVE_SCHEMA_VERSION; version++) {
    const migrate = SERIALIZED_STATE_MIGRATIONS[version];
    if (migrate) current = migrate(current);
  }

  return current;
}

export function createVersionedSaveFile(
  serialized: SerializedGameState,
  savedAt?: string,
): VersionedSaveFile {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameId: SAVE_GAME_ID,
    savedAt: savedAt ?? new Date().toISOString(),
    state: serialized,
  };
}

export function extractSerializedState(raw: unknown): {
  serialized: SerializedGameState | null;
  schemaVersion: number;
  savedAt: string | null;
  error: string | null;
} {
  const format = detectSaveFormat(raw);
  if (format === 'invalid') {
    return { serialized: null, schemaVersion: -1, savedAt: null, error: 'Invalid save file format.' };
  }

  if (format === 'legacy') {
    const err = validateSerializedState(raw);
    if (err) return { serialized: null, schemaVersion: -1, savedAt: null, error: err };
    return {
      serialized: raw as SerializedGameState,
      schemaVersion: LEGACY_SAVE_SCHEMA_VERSION,
      savedAt: (raw as SerializedGameState).saveMetadata?.savedAt ?? null,
      error: null,
    };
  }

  const wrapped = raw as VersionedSaveFile;
  const err = validateVersionedSave(wrapped);
  if (err) {
    return { serialized: null, schemaVersion: wrapped.schemaVersion, savedAt: null, error: err };
  }

  return {
    serialized: wrapped.state,
    schemaVersion: wrapped.schemaVersion,
    savedAt: wrapped.savedAt,
    error: null,
  };
}

export function sanitizeLoadedGameState(state: GameState): GameState {
  let selectedSystemId = state.selectedSystemId;
  let selectedFleetId = state.selectedFleetId;

  if (selectedSystemId && !state.systems.some(s => s.id === selectedSystemId)) {
    selectedSystemId = null;
  }
  if (selectedFleetId && !state.fleets.some(f => f.id === selectedFleetId)) {
    selectedFleetId = null;
  }

  return { ...state, selectedSystemId, selectedFleetId };
}

export function parseAndHydrateSave(raw: unknown): { state: GameState | null; error: string | null } {
  const extracted = extractSerializedState(raw);
  if (extracted.error || !extracted.serialized) {
    return { state: null, error: extracted.error ?? 'Invalid save file format.' };
  }

  try {
    const migrated = migrateSerializedState(extracted.serialized, extracted.schemaVersion);
    const state = sanitizeLoadedGameState(deserializeGame(migrated));
    return { state, error: null };
  } catch {
    return { state: null, error: 'Save file is corrupted and could not be loaded.' };
  }
}

export function parseSaveJson(json: string): { raw: unknown; error: string | null } {
  try {
    return { raw: JSON.parse(json), error: null };
  } catch {
    return { raw: null, error: 'Could not parse save file. The file may be corrupted.' };
  }
}

/** Read serialized state from stored JSON regardless of envelope version. */
export function readStoredSavePayload(raw: unknown): SerializedGameState | null {
  const extracted = extractSerializedState(raw);
  if (extracted.error || !extracted.serialized) return null;
  return migrateSerializedState(extracted.serialized, extracted.schemaVersion);
}