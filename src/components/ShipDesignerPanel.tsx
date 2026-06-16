import { useState } from 'react';
import {
  canBuildShipDesign,
  calculateShipDesignCost,
  calculateShipDesignStats,
  getAvailableModules,
  getDesignDisplayStats,
  updateShipDesignModule,
  validateShipDesign,
} from '../game/shipDesigns';
import { createCustomShipDesignId, saveShipDesign } from '../game/actions';
import { formatStrategicCost } from '../game/strategicResources';
import { cloneGameState } from '../game/clone';
import { Icon } from './icons/Icon';
import type { ModuleCategory } from '../game/shipModules';
import type { GameState, ShipDesign } from '../game/types';

interface Props {
  state: GameState;
  onUpdate: (state: GameState) => void;
}

const SLOT_LABELS: Record<ModuleCategory, string> = {
  weapon: 'Weapon',
  defense: 'Defense',
  engine: 'Engine',
  utility: 'Utility',
};

export function ShipDesignerPanel({ state, onUpdate }: Props) {
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const designs = player.shipDesigns ?? [];
  const [selectedId, setSelectedId] = useState(designs[0]?.id ?? '');
  const [draft, setDraft] = useState<ShipDesign | null>(null);

  const selected = draft ?? designs.find(d => d.id === selectedId) ?? designs[0];
  if (!selected) {
    return (
      <div className="panel-content" data-testid="ship-designer">
        <p className="panel-empty">No ship designs available.</p>
      </div>
    );
  }

  const stats = calculateShipDesignStats(selected);
  const cost = calculateShipDesignCost(selected);
  const validationErr = validateShipDesign(selected, player.researchedTechs);
  const buildErr = canBuildShipDesign(selected, player);
  const isEditing = draft !== null;

  const handleSelect = (id: string) => {
    setDraft(null);
    setSelectedId(id);
  };

  const handleModuleChange = (category: ModuleCategory, moduleId: string) => {
    const base = draft ?? selected;
    setDraft(updateShipDesignModule(base, category, moduleId));
  };

  const handleSave = () => {
    if (!draft) return;
    const newState = cloneGameState(state);
    const err = saveShipDesign(newState, draft);
    if (err) return;
    setDraft(null);
    setSelectedId(draft.id);
    onUpdate(newState);
  };

  const handleClone = () => {
    const clone: ShipDesign = {
      ...selected,
      id: createCustomShipDesignId(player.id),
      name: `${selected.name} Custom`,
      isDefault: false,
    };
    setDraft(clone);
    setSelectedId(clone.id);
  };

  return (
    <div className="panel-content" data-testid="ship-designer">
      <div className="section">
        <div className="section-title">
          <Icon name="fleet" size={14} />
          Ship Designer
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8 }}>
          Customize modules to change combat stats, costs, and strategic requirements. Default designs cannot be overwritten — clone to edit.
        </p>
        <div className="action-buttons" style={{ flexWrap: 'wrap', gap: 4 }} data-testid="ship-design-list">
          {designs.map(d => (
            <button
              key={d.id}
              className={`btn btn-sm ${selected.id === d.id && !isEditing ? 'btn-primary' : ''}`}
              data-testid={`ship-design-${d.id}`}
              onClick={() => handleSelect(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
        {!selected.isDefault && (
          <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={handleClone}>
            Clone as New Design
          </button>
        )}
        {selected.isDefault && (
          <button className="btn btn-sm btn-primary" style={{ marginTop: 6 }} onClick={handleClone} data-testid="clone-ship-design">
            Customize (Clone)
          </button>
        )}
      </div>

      <div className="section">
        <div className="section-title">{selected.name}</div>
        <div className="info-row"><span>Hull</span><span>{selected.hull}</span></div>
        <div className="info-row"><span>Role</span><span>{selected.role}</span></div>
        <div
          className="info-row"
          data-testid="ship-design-stats"
          style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
        >
          <span>Computed Stats</span>
          <span style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
            ATK {stats.attack} · DEF {stats.defense} · HP {stats.maxHp} · SPD {stats.speed} · {stats.weaponType}/{stats.defenseType}
          </span>
        </div>
        <div className="info-row" data-testid="ship-design-cost">
          <span>Build Cost</span>
          <span>{cost.credits}c / {cost.industry}i{formatStrategicCost(cost.strategic) ? ` · ${formatStrategicCost(cost.strategic)}` : ''}</span>
        </div>
        {(validationErr || buildErr) && (
          <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 6 }} data-testid="ship-design-requirements">
            {validationErr || buildErr}
          </p>
        )}
        {!validationErr && !buildErr && (
          <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 6 }} data-testid="ship-design-valid">
            Design valid and buildable with current resources.
          </p>
        )}
      </div>

      <div className="section">
        <div className="section-title">Module Slots</div>
        {(['weapon', 'defense', 'engine', 'utility'] as ModuleCategory[]).map(category => {
          const options = getAvailableModules(selected.hull, category, player.researchedTechs);
          const canEdit = isEditing || !selected.isDefault;
          return (
            <div key={category} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{SLOT_LABELS[category]}</label>
              <select
                value={selected.modules[category]}
                disabled={!canEdit}
                data-testid={`module-slot-${category}`}
                onChange={e => handleModuleChange(category, e.target.value)}
                style={{ width: '100%', marginTop: 2 }}
              >
                {options.map(mod => (
                  <option key={mod.id} value={mod.id}>{mod.name}</option>
                ))}
              </select>
            </div>
          );
        })}
        {isEditing && (
          <div className="action-buttons" style={{ marginTop: 8 }}>
            <button className="btn btn-sm btn-primary" data-testid="save-ship-design" onClick={handleSave}>
              Save Design
            </button>
            <button className="btn btn-sm" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        )}
        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 8 }}>
          {getDesignDisplayStats(selected)}
        </p>
      </div>
    </div>
  );
}