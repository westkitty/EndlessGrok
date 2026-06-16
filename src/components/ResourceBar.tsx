import type { ReactNode } from 'react';
import { Icon } from './icons/Icon';
import { type IconName } from './icons/iconHelpers';
import { Tooltip } from './Tooltip';
import {
  STARSILK_RESOURCE_KEYS,
  STARSILK_RESOURCE_LABELS,
} from '../game/starsilkResources';
import type { EconomyBreakdown, Resources, StarsilkResources, StrategicResources } from '../game/types';

interface ResourceBarProps {
  resources: Resources;
  strategicResources?: StrategicResources;
  deltas?: Partial<Resources>;
  influence?: number;
  economy?: EconomyBreakdown;
  compact?: boolean;
  showStrategicResources?: boolean;
  strategicIncome?: StrategicResources;
  starsilkResources?: StarsilkResources;
  showStarsilkResources?: boolean;
  starsilkIncome?: StarsilkResources;
}

const STRATEGIC_CONFIG: {
  key: keyof StrategicResources;
  icon: IconName;
  label: string;
  color: string;
}[] = [
  { key: 'titanium', icon: 'titanium', label: 'Titanium', color: '#c0c0c0' },
  { key: 'antimatter', icon: 'antimatter', label: 'Antimatter', color: '#ff66ff' },
  { key: 'darkmatter', icon: 'darkmatter', label: 'Dark Matter', color: '#9b6dff' },
];

const RESOURCE_CONFIG: {
  key: keyof Resources | 'influence';
  icon: IconName;
  label: string;
  color: string;
}[] = [
  { key: 'credits', icon: 'credits', label: 'Credits', color: 'var(--res-credits)' },
  { key: 'food', icon: 'food', label: 'Food', color: 'var(--res-food)' },
  { key: 'industry', icon: 'industry', label: 'Industry', color: 'var(--res-industry)' },
  { key: 'science', icon: 'science', label: 'Science', color: 'var(--res-science)' },
  { key: 'influence', icon: 'influence', label: 'Influence', color: 'var(--res-influence)' },
];

function formatDelta(value: number): string {
  if (value === 0) return '';
  return value > 0 ? `+${value}` : `${value}`;
}

function buildTooltip(
  key: keyof Resources | 'influence',
  value: number,
  deltaStr: string,
  economy?: EconomyBreakdown
): ReactNode {
  const label = RESOURCE_CONFIG.find(r => r.key === key)?.label ?? key;

  if (key === 'influence' || !economy) {
    return (
      <span>
        <strong>{label}</strong>: {value}
        {deltaStr && ` (${deltaStr} last turn)`}
      </span>
    );
  }

  const income = economy.income[key];
  const expense = key === 'credits'
    ? economy.expenses.credits
    : economy.expenses[key];
  const net = economy.net[key];

  return (
    <span>
      <strong>{label}</strong>: {value}
      {deltaStr && ` (${deltaStr} last turn)`}
      <br />
      <span style={{ color: 'var(--success)' }}>Income: +{income}</span>
      {expense > 0 && (
        <>
          <br />
          <span style={{ color: 'var(--danger)' }}>Expenses: -{expense}</span>
        </>
      )}
      <br />
      <span style={{ color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
        Net: {net >= 0 ? '+' : ''}{net}
      </span>
      {key === 'credits' && economy.expenses.fleetUpkeep > 0 && (
        <>
          <br />
          <span style={{ fontSize: '0.85em', color: 'var(--text-dim)' }}>
            Fleet upkeep: -{economy.expenses.fleetUpkeep} · Maintenance: -{economy.expenses.maintenance}
          </span>
        </>
      )}
    </span>
  );
}

export function ResourceBar({
  resources,
  strategicResources,
  deltas,
  influence,
  economy,
  compact = false,
  showStrategicResources = false,
  strategicIncome,
  starsilkResources,
  showStarsilkResources = false,
  starsilkIncome,
}: ResourceBarProps) {
  const visibleStrategic = strategicResources && showStrategicResources
    ? STRATEGIC_CONFIG
    : strategicResources
      ? STRATEGIC_CONFIG.filter(({ key }) => strategicResources[key] > 0)
      : [];

  return (
    <div className={`resource-bar ${compact ? 'resource-bar--compact' : ''}`} data-testid="resource-bar">
      {RESOURCE_CONFIG.map(({ key, icon, color }) => {
        if (key === 'influence' && influence === undefined) return null;
        const value = key === 'influence' ? influence! : resources[key as keyof Resources];
        const delta = key !== 'influence' ? deltas?.[key as keyof Resources] : undefined;
        const deltaStr = delta !== undefined ? formatDelta(delta) : '';

        return (
          <Tooltip
            key={key}
            content={buildTooltip(key, value, deltaStr, economy)}
          >
            <div className="resource-item">
              <Icon name={icon} size={compact ? 16 : 20} className="resource-item__icon" />
              <span className="resource-item__value" style={{ color }}>{value}</span>
              {deltaStr && (
                <span className={`resource-item__delta ${delta! > 0 ? 'positive' : delta! < 0 ? 'negative' : ''}`}>
                  {deltaStr}
                </span>
              )}
            </div>
          </Tooltip>
        );
      })}
      {visibleStrategic.map(({ key, icon, label, color }) => {
        const income = strategicIncome?.[key] ?? 0;
        const incomeStr = income > 0 ? `+${income}/turn` : '';
        return (
          <Tooltip
            key={key}
            content={
              <span>
                <strong>{label}</strong>: {strategicResources![key]}
                {incomeStr && <> · Income: {incomeStr} from colonies</>}
              </span>
            }
          >
            <div className="resource-item" data-testid={`strategic-${key}`}>
              <Icon name={icon} size={compact ? 16 : 20} className="resource-item__icon" />
              <span className="resource-item__value" style={{ color }}>{strategicResources![key]}</span>
              {incomeStr && (
                <span className="resource-item__delta positive" style={{ fontSize: '0.65rem' }}>{incomeStr}</span>
              )}
            </div>
          </Tooltip>
        );
      })}
      {showStarsilkResources && starsilkResources && STARSILK_RESOURCE_KEYS.map(key => {
        const val = starsilkResources[key];
        if (val <= 0 && !(starsilkIncome?.[key] ?? 0)) return null;
        const income = starsilkIncome?.[key] ?? 0;
        return (
          <Tooltip
            key={key}
            content={
              <span>
                <strong>{STARSILK_RESOURCE_LABELS[key]}</strong>: {val}
                {income > 0 && <> · +{income}/turn from deposits/archives</>}
              </span>
            }
          >
            <div className="resource-item" data-testid={`starsilk-${key}`}>
              <span className="resource-item__value" style={{ color: 'var(--accent-violet)', fontSize: '0.75rem' }}>
                {val}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                {STARSILK_RESOURCE_LABELS[key].split(' ')[0]}
              </span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}