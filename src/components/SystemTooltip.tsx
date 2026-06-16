import { getStarColor } from '../game/galaxy';
import { getStarbindingWarnings, isCollapsedSystem } from '../game/heliocide';
import { canSelectStarbindingTarget } from '../game/starbinding';
import { getIntelLabel } from '../game/intel';
import { Icon } from './icons/Icon';
import type { GameState, StarSystem } from '../game/types';
import { getSectorLabel, getSystemOwner } from './galaxy/mapHelpers';

interface Props {
  system: StarSystem;
  state: GameState;
  playerId: string;
}

export function SystemTooltipContent({ system, state, playerId }: Props) {
  const player = state.empires.find(e => e.id === playerId)!;
  const owner = getSystemOwner(system.id, state);
  const isVisible = player.visibleSystems.has(system.id);
  const fleets = state.fleets.filter(f => f.systemId === system.id);
  const colonized = system.planets.filter(p => p.isColonized).length;
  const mapSize = state.systems.reduce((max, s) => Math.max(max, s.x, s.y), 800);
  const isChokepoint = system.connections.length <= 2;
  const intelLabel = getIntelLabel(player, system, state.turn);

  return (
    <div className="system-tooltip">
      <div className="floating-tooltip__title">{system.name}</div>
      <div className="floating-tooltip__row">
        <span>Sector</span>
        <span>{getSectorLabel(system, mapSize)}</span>
      </div>
      <div className="floating-tooltip__row">
        <span>Star</span>
        <span style={{ color: getStarColor(system.starClass) }}>{system.starClass}-type</span>
      </div>
      <div className="floating-tooltip__row">
        <span>Planets</span>
        <span>{system.planets.length} ({colonized} colonized)</span>
      </div>
      <div className="floating-tooltip__row">
        <span>Richness</span>
        <span>{(system.richness * 100).toFixed(0)}%</span>
      </div>
      <div className="floating-tooltip__row">
        <span>Strategic Value</span>
        <span>{isChokepoint ? 'Chokepoint' : system.richness >= 1.2 ? 'High' : 'Standard'}</span>
      </div>
      <div className="floating-tooltip__row">
        <span>Intel</span>
        <span style={{ color: intelLabel === 'Current' ? 'var(--accent-green)' : intelLabel === 'Unknown' ? 'var(--text-dim)' : 'var(--warning)' }}>
          {intelLabel}
        </span>
      </div>
      {owner && (
        <div className="floating-tooltip__row">
          <span>Owner</span>
          <span style={{ color: owner.color }}>{owner.name}</span>
        </div>
      )}
      {fleets.length > 0 && (
        <div className="floating-tooltip__row">
          <span><Icon name="fleet" size={12} /> Fleets</span>
          <span>{fleets.length}</span>
        </div>
      )}
      {system.anomaly && isVisible && (
        <div className="floating-tooltip__row">
          <span><Icon name="anomaly" size={12} /> Anomaly</span>
          <span>{system.anomaly.name}</span>
        </div>
      )}
      {system.systemType === 'black_hole' && (
        <div className="floating-tooltip__row">
          <span>Type</span>
          <span style={{ color: 'var(--accent-violet)' }}>Black Hole / Singularity</span>
        </div>
      )}
      {system.isArchiveStar && !isCollapsedSystem(system) && (
        <div className="floating-tooltip__row">
          <span>Archive</span>
          <span style={{ color: 'var(--accent-cyan)' }}>Archive star</span>
        </div>
      )}
      {getStarbindingWarnings(system).map(w => (
        <div key={w} className="floating-tooltip__row">
          <span>Warning</span>
          <span style={{ color: 'var(--warning)' }}>{w}</span>
        </div>
      ))}
      {(() => {
        const err = canSelectStarbindingTarget(state, system.id, playerId);
        if (err === 'Already targeted') {
          return (
            <div className="floating-tooltip__row">
              <span>Starbinding</span>
              <span style={{ color: 'var(--accent-violet)' }}>Dive target selected</span>
            </div>
          );
        }
        if (!err && system.isArchiveStar) {
          return (
            <div className="floating-tooltip__row">
              <span>Starbinding</span>
              <span style={{ color: 'var(--accent-violet)' }}>Eligible dive target</span>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}