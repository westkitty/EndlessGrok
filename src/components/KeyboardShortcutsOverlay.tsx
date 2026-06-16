const SHORTCUTS = [
  { keys: 'E', action: 'End Turn' },
  { keys: '1–6', action: 'Switch panel tabs' },
  { keys: 'Esc', action: 'Pause menu' },
  { keys: '?', action: 'Show hotkeys' },
  { keys: 'Scroll', action: 'Zoom galaxy map' },
  { keys: 'Drag', action: 'Pan galaxy map' },
  { keys: 'R', action: 'Reset map zoom' },
];

interface Props {
  onClose: () => void;
}

export function KeyboardShortcutsOverlay({ onClose }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-content hotkeys-panel" onClick={e => e.stopPropagation()}>
        <h2>Keyboard Shortcuts</h2>
        <ul className="hotkeys-list">
          {SHORTCUTS.map(s => (
            <li key={s.keys} className="hotkeys-item">
              <kbd>{s.keys}</kbd>
              <span>{s.action}</span>
            </li>
          ))}
        </ul>
        <button className="btn" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}