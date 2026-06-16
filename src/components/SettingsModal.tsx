import { GALAXY_SHAPE_DESCRIPTIONS } from '../game/settings';
import type { UISettings, UIScale } from '../game/uiSettings';
import type { GalaxyShape } from '../game/types';

interface Props {
  settings: UISettings;
  onChange: (settings: UISettings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, onChange, onClose }: Props) {
  const update = (patch: Partial<UISettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-content settings-modal" onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>

        <label className="settings-row">
          <span>Animations</span>
          <input
            type="checkbox"
            checked={settings.animationsEnabled}
            onChange={e => update({ animationsEnabled: e.target.checked })}
          />
        </label>

        <label className="settings-row">
          <span>Scanline Effect</span>
          <input
            type="checkbox"
            checked={settings.scanlinesEnabled}
            onChange={e => update({ scanlinesEnabled: e.target.checked })}
          />
        </label>

        <label className="settings-row settings-row--dim">
          <span>Sound</span>
          <input type="checkbox" disabled checked={false} title="Audio system coming soon" />
          <small className="settings-placeholder">Coming soon</small>
        </label>

        <div className="settings-row">
          <span>Default Galaxy Shape</span>
          <select
            value={settings.defaultGalaxyShape}
            onChange={e => update({ defaultGalaxyShape: e.target.value as GalaxyShape })}
          >
            {(['spiral', 'cluster', 'ring', 'elliptical', 'sparse'] as GalaxyShape[]).map(shape => (
              <option key={shape} value={shape}>{shape}</option>
            ))}
          </select>
          <small className="settings-placeholder">{GALAXY_SHAPE_DESCRIPTIONS[settings.defaultGalaxyShape]}</small>
        </div>

        <div className="settings-row">
          <span>UI Scale</span>
          <div className="settings-scale-group">
            {([0.9, 1, 1.1] as UIScale[]).map(scale => (
              <button
                key={scale}
                className={`btn btn-sm ${settings.uiScale === scale ? 'btn-primary' : ''}`}
                onClick={() => update({ uiScale: scale })}
              >
                {scale}x
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}