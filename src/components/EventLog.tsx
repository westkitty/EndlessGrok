import { useMemo, useState } from 'react';
import { Icon } from './icons/Icon';
import type { GameEvent } from '../game/types';

interface Props {
  events: GameEvent[];
  activeEventChains?: import('../game/types').EventChainState[];
}

type EventFilter = 'all' | 'combat' | 'diplomacy' | 'economy';

const ECONOMY_TYPES = new Set<GameEvent['type']>(['building', 'production', 'colonize', 'event']);

const EVENT_ICONS: Partial<Record<GameEvent['type'], Parameters<typeof Icon>[0]['name']>> = {
  combat: 'combat',
  colonize: 'colony',
  research: 'research',
  diplomacy: 'diplomacy',
  victory: 'emblem-terran',
  defeat: 'combat',
};

const FILTER_CHIPS: { id: EventFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'combat', label: 'Combat' },
  { id: 'diplomacy', label: 'Diplomacy' },
  { id: 'economy', label: 'Economy' },
];

function matchesFilter(event: GameEvent, filter: EventFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'combat') return event.type === 'combat' || event.type === 'capture' || event.type === 'siege';
  if (filter === 'diplomacy') return event.type === 'diplomacy';
  if (filter === 'economy') return ECONOMY_TYPES.has(event.type);
  return true;
}

export function EventLog({ events, activeEventChains }: Props) {
  const [filter, setFilter] = useState<EventFilter>('all');
  const archive = useMemo(() => [...events].slice(-100).reverse(), [events]);

  const filtered = useMemo(() => {
    return archive.filter(e => matchesFilter(e, filter)).slice(0, 20);
  }, [archive, filter]);

  return (
    <div className="event-log-section">
      <div className="section-title">Event Log</div>
      {activeEventChains && activeEventChains.length > 0 && (
        <div className="event-chain-progress">
          {activeEventChains.map(chain => (
            <div key={`${chain.chainId}-${chain.empireId}`} className="event-chain-item">
              <span className="event-chain-item__name">{chain.chainId.replace(/_/g, ' ')}</span>
              <div className="progress-bar" style={{ height: 4 }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, ((chain.step + 1) / 3) * 100)}%` }} />
              </div>
              <span className="event-chain-item__step">Step {chain.step + 1}/3</span>
            </div>
          ))}
        </div>
      )}
      <div className="event-log-filters" style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.id}
            type="button"
            className={`btn btn-sm ${filter === chip.id ? 'btn-primary' : ''}`}
            onClick={() => setFilter(chip.id)}
            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <div className="event-log">
        {filtered.map((event, i) => (
          <div
            key={`${event.turn}-${i}`}
            className={`event-item ${event.type}`}
            data-testid={event.eventDefinitionId ? `event-log-${event.eventDefinitionId}` : `event-log-${event.type}-${event.turn}-${i}`}
          >
            {EVENT_ICONS[event.type] && (
              <Icon name={EVENT_ICONS[event.type]!} size={10} style={{ marginRight: 4, verticalAlign: 'middle', opacity: 0.7 }} />
            )}
            [T{event.turn}] {event.message}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="event-item" style={{ opacity: 0.6 }}>No matching events</div>
        )}
      </div>
    </div>
  );
}