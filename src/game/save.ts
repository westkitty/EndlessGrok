import { AUTOSAVE_INTERVAL } from './constants';
import { deserializeGame, serializeGame } from './game';
import type { GameState, SaveMetadata, SerializedGameState } from './types';

const LEGACY_KEY = 'endlessgrok-save';
const AUTOSAVE_KEY = 'endlessgrok-autosave';
const SLOT_PREFIX = 'endlessgrok-slot-';
export const SAVE_SLOTS = ['slot-0', 'slot-1', 'slot-2'] as const;
export type SaveSlotId = typeof SAVE_SLOTS[number] | 'autosave';

function slotKey(slotId: SaveSlotId): string {
  if (slotId === 'autosave') return AUTOSAVE_KEY;
  return `${SLOT_PREFIX}${slotId.replace('slot-', '')}`;
}

export function buildSaveMetadata(state: GameState, slotId: SaveSlotId = 'slot-0'): SaveMetadata {
  const player = state.empires.find(e => e.id === state.playerEmpireId);
  return {
    turn: state.turn,
    faction: player?.name ?? 'Unknown',
    seed: state.seed,
    difficulty: state.settings.difficulty,
    galaxySize: state.settings.galaxySize,
    galaxyShape: state.settings.galaxyShape,
    savedAt: new Date().toISOString(),
    slotId,
  };
}

export function saveGame(state: GameState, slotId: SaveSlotId = 'slot-0'): boolean {
  try {
    const data = serializeGame(state);
    data.saveMetadata = buildSaveMetadata(state, slotId);
    localStorage.setItem(slotKey(slotId), JSON.stringify(data));
    if (slotId === 'slot-0' || slotId === 'autosave') {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(data));
    }
    return true;
  } catch {
    return false;
  }
}

export function autosaveGame(state: GameState): boolean {
  return saveGame(state, 'autosave');
}

export function loadGameFromSlot(slotId: SaveSlotId): { state: GameState | null; error: string | null } {
  try {
    const raw = localStorage.getItem(slotKey(slotId));
    if (!raw) return { state: null, error: null };
    const data = JSON.parse(raw) as SerializedGameState;
    return { state: deserializeGame(data), error: null };
  } catch {
    return { state: null, error: 'Save file is corrupted and could not be loaded.' };
  }
}

export function loadGame(): GameState | null {
  const autosave = loadGameFromSlot('autosave');
  if (autosave.state) return autosave.state;
  for (const slot of SAVE_SLOTS) {
    const result = loadGameFromSlot(slot);
    if (result.state) return result.state;
  }
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return deserializeGame(JSON.parse(raw) as SerializedGameState);
  } catch {
    return null;
  }
}

export function listSaveMetadata(): (SaveMetadata & { slotId: SaveSlotId; corrupt?: boolean })[] {
  const results: (SaveMetadata & { slotId: SaveSlotId; corrupt?: boolean })[] = [];
  const allSlots: SaveSlotId[] = ['autosave', ...SAVE_SLOTS];

  for (const slotId of allSlots) {
    try {
      const raw = localStorage.getItem(slotKey(slotId));
      if (!raw) continue;
      const data = JSON.parse(raw) as SerializedGameState;
      if (data.saveMetadata) {
        results.push({ ...data.saveMetadata, slotId });
      } else {
        const player = data.empires.find(e => e.id === data.playerEmpireId);
        results.push({
          turn: data.turn,
          faction: player?.name ?? 'Unknown',
          seed: data.seed,
          difficulty: data.settings?.difficulty ?? 'normal',
          galaxySize: data.settings?.galaxySize ?? 'medium',
          galaxyShape: data.settings?.galaxyShape ?? 'spiral',
          savedAt: new Date().toISOString(),
          slotId,
        });
      }
    } catch {
      results.push({
        turn: 0,
        faction: 'Corrupted Save',
        seed: 0,
        difficulty: 'normal',
        galaxySize: 'medium',
        galaxyShape: 'spiral',
        savedAt: '',
        slotId,
        corrupt: true,
      });
    }
  }
  return results.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

export function hasSave(): boolean {
  return listSaveMetadata().length > 0 || localStorage.getItem(LEGACY_KEY) !== null;
}

export function getSaveMetadata(): SaveMetadata | null {
  const list = listSaveMetadata();
  return list[0] ?? null;
}

export function deleteSave(slotId?: SaveSlotId): void {
  if (slotId) {
    localStorage.removeItem(slotKey(slotId));
    if (slotId === 'slot-0') localStorage.removeItem(LEGACY_KEY);
    return;
  }
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(AUTOSAVE_KEY);
  for (const slot of SAVE_SLOTS) {
    localStorage.removeItem(slotKey(slot));
  }
}

export function shouldAutosave(turn: number): boolean {
  return turn > 0 && turn % AUTOSAVE_INTERVAL === 0;
}

export function exportSaveToJson(state: GameState): string {
  const data = serializeGame(state);
  data.saveMetadata = buildSaveMetadata(state);
  return JSON.stringify(data, null, 2);
}

export function importSaveFromJson(json: string): { state: GameState | null; error: string | null } {
  try {
    const data = JSON.parse(json) as SerializedGameState;
    if (!data.seed || !data.empires || !data.systems) {
      return { state: null, error: 'Invalid save file format.' };
    }
    const state = deserializeGame(data);
    saveGame(state, 'slot-0');
    return { state, error: null };
  } catch {
    return { state: null, error: 'Could not parse save file. The file may be corrupted.' };
  }
}

export function downloadSave(state: GameState, filename?: string): void {
  const json = exportSaveToJson(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `endlessgrok-turn${state.turn}-seed${state.seed}.json`;
  a.click();
  URL.revokeObjectURL(url);
}