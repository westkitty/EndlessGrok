import { Icon, getShipIconName } from './icons/Icon';
import { getProductionQueueEta } from '../game/production';
import { getShipDisplayName } from '../game/ships';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
}

export function ProductionOverview({ state }: Props) {
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const queues = state.systems
    .flatMap(sys =>
      sys.planets
        .filter(p => p.ownerId === player.id)
        .flatMap(p =>
          p.productionQueue.map(q => ({
            ...q,
            planetName: p.name,
            systemName: sys.name,
          }))
        )
    );

  if (queues.length === 0) {
    return (
      <div className="section">
        <div className="section-title">
          <Icon name="industry" size={14} />
          Empire Production
        </div>
        <p className="panel-empty" style={{ padding: '8px 0' }}>No active production queues.</p>
      </div>
    );
  }

  return (
    <div className="section panel-section--stagger-3">
      <div className="section-title">
        <Icon name="industry" size={14} />
        Empire Production ({queues.length})
      </div>
      {queues.map(item => {
        const eta = getProductionQueueEta(item);
        return (
        <div key={item.id} className="production-queue-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.kind === 'ship' && <Icon name={getShipIconName(item.type)} size={16} />}
            <span style={{ fontWeight: 600 }}>
              {item.kind === 'ship' ? getShipDisplayName(item.type as never) : item.type}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
            {item.systemName} — {item.planetName}
          </div>
          <div className="progress-bar" style={{ marginTop: 4 }}>
            <div
              className="progress-fill"
              style={{ width: `${((item.totalTurns - item.turnsRemaining) / item.totalTurns) * 100}%` }}
            />
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-cyan)' }}>
            ETA: {eta.turnsRemaining} turn{eta.turnsRemaining !== 1 ? 's' : ''} · {Math.round(eta.percentComplete)}% complete
          </span>
        </div>
        );
      })}
    </div>
  );
}