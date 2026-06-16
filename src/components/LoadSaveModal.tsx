import { listSaveMetadata, type SaveSlotId } from '../game/save';
import type { SaveMetadata } from '../game/types';

interface Props {
  onLoad: (slotId: SaveSlotId) => void;
  onCancel: () => void;
  loadError?: string | null;
}

function formatSlotLabel(slotId: SaveSlotId): string {
  if (slotId === 'autosave') return 'Autosave';
  return `Slot ${parseInt(slotId.replace('slot-', '')) + 1}`;
}

export function LoadSaveModal({ onLoad, onCancel, loadError }: Props) {
  const saves = listSaveMetadata();

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="overlay-content load-save-modal" onClick={e => e.stopPropagation()}>
        <h2>Load Game</h2>
        {loadError && (
          <p className="load-save-error">{loadError}</p>
        )}
        {saves.length === 0 ? (
          <p style={{ color: 'var(--text-dim)' }}>No saves found.</p>
        ) : (
          <div className="save-list">
            {saves.map((save: SaveMetadata & { slotId: SaveSlotId; corrupt?: boolean }) => (
              <button
                key={save.slotId}
                className={`save-list-item ${save.corrupt ? 'save-list-item--corrupt' : ''}`}
                disabled={!!save.corrupt}
                onClick={() => onLoad(save.slotId)}
              >
                <span className="save-list-item__slot">{formatSlotLabel(save.slotId)}</span>
                <span className="save-list-item__faction">{save.faction}</span>
                <span className="save-list-item__meta">
                  Turn {save.turn} · {save.galaxySize} · {save.difficulty}
                </span>
                {save.corrupt && <span className="save-list-item__corrupt">Corrupted</span>}
              </button>
            ))}
          </div>
        )}
        <button className="btn" style={{ marginTop: 16 }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}