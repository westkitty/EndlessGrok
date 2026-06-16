import { useState } from 'react';
import { cancelFleetMovement } from '../game/actions';
import {
  filterFleetSummaries,
  getPlayerFleetSummaries,
  type FleetFilter,
} from '../game/fleetManager';
import { cloneGameState } from '../game/clone';
import { AssetIcon } from './AssetIcon';
import { getFleetRoleMechanicalKey, getFleetStanceMechanicalKey } from '../data/assets/resolve';
import { Tooltip } from './Tooltip';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onUpdate: (state: GameState) => void;
}

const FILTERS: { id: FleetFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'idle', label: 'Idle' },
  { id: 'moving', label: 'Moving' },
  { id: 'scout', label: 'Scouts' },
  { id: 'military', label: 'Military' },
  { id: 'colony', label: 'Colony' },
];

export function FleetPanel({ state, onUpdate }: Props) {
  const [filter, setFilter] = useState<FleetFilter>('all');
  const summaries = filterFleetSummaries(getPlayerFleetSummaries(state), filter);

  const handleSelectFleet = (fleetId: string, systemId: string) => {
    onUpdate({
      ...state,
      selectedFleetId: fleetId,
      selectedSystemId: systemId,
    });
  };

  const handleCancelMovement = (fleetId: string) => {
    const newState = cloneGameState(state);
    if (cancelFleetMovement(newState, fleetId)) {
      newState.events = [
        ...newState.events,
        { turn: state.turn, type: 'explore', message: 'Fleet movement order canceled.' },
      ];
      onUpdate(newState);
    }
  };

  return (
    <div className="panel-content" data-testid="fleet-manager">
      <div className="section">
        <div className="section-title">
          <AssetIcon mechanicalKey="fleet:manager" size={14} />
          Fleet Manager ({summaries.length})
        </div>
        <div className="action-buttons" style={{ flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`btn btn-sm ${filter === f.id ? 'btn-primary' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {summaries.length === 0 ? (
        <p className="panel-empty" data-testid="fleet-manager-empty">
          No fleets match this filter.
        </p>
      ) : (
        <div className="fleet-manager-list">
          {summaries.map(summary => {
            const isSelected = state.selectedFleetId === summary.fleet.id;
            const canCancel = summary.status === 'moving';
            return (
              <div
                key={summary.fleet.id}
                className={`fleet-card ${isSelected ? 'fleet-card--selected' : ''}`}
                data-testid="fleet-card"
              >
                <div className="fleet-card__header">
                  <span className="fleet-card__name">{summary.name}</span>
                  <span className={`fleet-card__status fleet-card__status--${summary.status}`}>
                    {summary.status === 'moving' ? 'In Transit' : summary.status === 'idle' ? 'Ready' : 'Deployed'}
                  </span>
                </div>
                <div className="fleet-card__meta">
                  <span>Location: {summary.systemName}</span>
                  {summary.destinationName && (
                    <span> → {summary.destinationName}{summary.etaTurns !== null ? ` (${summary.etaTurns}t)` : ''}</span>
                  )}
                </div>
                <div className="fleet-card__stats">
                  <span data-testid={`fleet-role-${summary.fleet.id}`}>
                    <AssetIcon mechanicalKey={getFleetRoleMechanicalKey(summary.role)} size={12} /> {summary.role}
                  </span>
                  <span>{summary.shipCount} ships</span>
                  <span>Str: {summary.strength}</span>
                  <span data-testid={`fleet-stance-${summary.fleet.id}`}>
                    <AssetIcon mechanicalKey={getFleetStanceMechanicalKey(summary.stance)} size={12} /> {summary.stance}
                  </span>
                  <span>{summary.upkeep} cr/upkeep</span>
                </div>
                <div className="action-buttons" style={{ marginTop: 6, gap: 4 }}>
                  <button
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : ''}`}
                    onClick={() => handleSelectFleet(summary.fleet.id, summary.fleet.systemId)}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                  <Tooltip content={canCancel ? 'Cancel movement order' : 'Fleet is not moving'}>
                    <button
                      className="btn btn-sm"
                      disabled={!canCancel}
                      onClick={() => handleCancelMovement(summary.fleet.id)}
                    >
                      Cancel Move
                    </button>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}