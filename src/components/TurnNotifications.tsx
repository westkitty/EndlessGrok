import { useEffect, useState, useRef, useMemo } from 'react';
import { Icon } from './icons/Icon';
import type { IconName } from './icons/iconHelpers';
import type { GameEvent } from '../game/types';

interface TurnNotificationsProps {
  events: GameEvent[];
  turn: number;
}

interface Notification {
  id: number;
  type: GameEvent['type'];
  message: string;
  turn: number;
}

const NOTIFY_TYPES = new Set<GameEvent['type']>(['research', 'colonize', 'combat', 'victory', 'defeat', 'diplomacy', 'event', 'anomaly']);

const TYPE_ICONS: Partial<Record<GameEvent['type'], IconName>> = {
  research: 'research',
  colonize: 'colony',
  combat: 'combat',
  victory: 'emblem-terran',
  defeat: 'combat',
  diplomacy: 'diplomacy',
  event: 'anomaly',
  anomaly: 'anomaly',
};

const TYPE_LABELS: Partial<Record<GameEvent['type'], string>> = {
  research: 'Research',
  colonize: 'Colonization',
  combat: 'Combat',
  victory: 'Victory',
  defeat: 'Defeat',
  diplomacy: 'Diplomacy',
  event: 'Events',
  anomaly: 'Anomaly',
};

let notifId = 0;

export function TurnNotifications({ events, turn }: TurnNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newNotifs: Notification[] = [];

    for (const event of events) {
      if (!NOTIFY_TYPES.has(event.type)) continue;
      const key = `${event.turn}-${event.type}-${event.message}`;
      if (seenRef.current.has(key)) continue;
      seenRef.current.add(key);

      newNotifs.push({
        id: ++notifId,
        type: event.type,
        message: event.message,
        turn: event.turn,
      });
    }

    if (newNotifs.length === 0) return;

    const frame = requestAnimationFrame(() => {
      setNotifications(prev => [...newNotifs, ...prev].slice(0, 8));
    });
    return () => cancelAnimationFrame(frame);
  }, [events, turn]);

  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [notifications]);

  const grouped = useMemo(() => {
    const groups = new Map<GameEvent['type'], Notification[]>();
    for (const notif of notifications) {
      const list = groups.get(notif.type) ?? [];
      list.push(notif);
      groups.set(notif.type, list);
    }
    return [...groups.entries()];
  }, [notifications]);

  const dismissGroup = (type: GameEvent['type']) => {
    setNotifications(prev => prev.filter(n => n.type !== type));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="turn-notifications">
      {grouped.map(([type, items]) => (
        <div key={type} className={`turn-notification-group turn-notification-group--${type}`}>
          <div className={`turn-notification turn-notification--${type}`}>
            {TYPE_ICONS[type] && (
              <Icon name={TYPE_ICONS[type]!} size={22} className="turn-notification__icon" />
            )}
            <div className="turn-notification__body">
              <span className="turn-notification__label">
                {TYPE_LABELS[type] ?? type}
                {items.length > 1 ? ` (${items.length})` : ''}
              </span>
              {items.length === 1 ? (
                <span className="turn-notification__message">{items[0].message}</span>
              ) : (
                <ul className="turn-notification__list" style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: '0.8rem' }}>
                  {items.map(item => (
                    <li key={item.id}>{item.message}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              className="turn-notification__dismiss"
              onClick={() => dismissGroup(type)}
              aria-label="Dismiss group"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}