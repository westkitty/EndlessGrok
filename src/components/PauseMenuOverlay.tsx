interface Props {
  onResume: () => void;
  onSave: () => void;
  onSettings: () => void;
  onMenu: () => void;
}

export function PauseMenuOverlay({ onResume, onSave, onSettings, onMenu }: Props) {
  return (
    <div className="overlay pause-overlay">
      <div className="overlay-content pause-menu">
        <h2>Paused</h2>
        <div className="menu-buttons" style={{ minWidth: 240 }}>
          <button className="btn btn-primary" onClick={onResume}>Resume</button>
          <button className="btn" onClick={onSave}>Save Game</button>
          <button className="btn" onClick={onSettings}>Settings</button>
          <button className="btn btn-danger" onClick={onMenu}>Main Menu</button>
        </div>
        <p style={{ marginTop: 16, fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
          Press Escape to resume
        </p>
      </div>
    </div>
  );
}