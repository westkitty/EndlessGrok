import { buildRuntimeTooltip } from '../data/assets/resolve';
import { AssetIcon } from './AssetIcon';
import { StarsilkTooltipContent } from './StarsilkTooltip';
import { Tooltip } from './Tooltip';
import { STARSILK_RESOURCE_KEYS } from '../game/starsilkResources';
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

const CORE_RESOURCE_KEYS: (keyof Resources | 'influence')[] = [
  'credits', 'food', 'industry', 'science', 'influence',
];

const STRATEGIC_KEYS: (keyof StrategicResources)[] = ['titanium', 'antimatter', 'darkmatter'];

const RESOURCE_COLORS: Record<string, string> = {
  credits: 'var(--res-credits)',
  food: 'var(--res-food)',
  industry: 'var(--res-industry)',
  science: 'var(--res-science)',
  influence: 'var(--res-influence)',
  titanium: '#c0c0c0',
  antimatter: '#ff66ff',
  darkmatter: '#9b6dff',
  starsilkThread: 'var(--accent-violet)',
  inertStarsilk: 'var(--accent-cyan)',
  syrinReagent: 'var(--accent-cyan)',
  archiveData: 'var(--res-science)',
  bloodRingGlass: 'var(--danger)',
  siegeLatticeFragment: 'var(--warning)',
};

function formatDelta(value: number): string {
  if (value === 0) return '';
  return value > 0 ? `+${value}` : `${value}`;
}

function buildEconomyRuntime(
  key: keyof Resources,
  value: number,
  deltaStr: string,
  economy?: EconomyBreakdown,
) {
  if (!economy) {
    return buildRuntimeTooltip(`resource:${key}`, { value, delta: deltaStr || undefined });
  }
  const income = economy.income[key];
  const expense = key === 'credits' ? economy.expenses.credits : economy.expenses[key];
  const net = economy.net[key];
  const incomeNote = key === 'credits' && economy.expenses.fleetUpkeep > 0
    ? `Fleet upkeep: -${economy.expenses.fleetUpkeep} · Maintenance: -${economy.expenses.maintenance}`
    : undefined;
  return buildRuntimeTooltip(`resource:${key}`, {
    value,
    delta: deltaStr || undefined,
    income,
    expense,
    net,
    incomeNote,
  });
}

function resolveResourceTestId(testIdSuffix: string): string {
  if (testIdSuffix === 'titanium' || testIdSuffix === 'antimatter' || testIdSuffix === 'darkmatter') {
    return `strategic-${testIdSuffix}`;
  }
  if (
    testIdSuffix === 'starsilkThread' ||
    testIdSuffix === 'inertStarsilk' ||
    testIdSuffix === 'syrinReagent' ||
    testIdSuffix === 'archiveData' ||
    testIdSuffix === 'bloodRingGlass' ||
    testIdSuffix === 'siegeLatticeFragment'
  ) {
    return `starsilk-${testIdSuffix}`;
  }
  return `resource-item-${testIdSuffix}`;
}

function ResourceItem({
  mechanicalKey,
  value,
  deltaStr,
  color,
  compact,
  tooltipData,
  testIdSuffix,
}: {
  mechanicalKey: string;
  value: number;
  deltaStr: string;
  color: string;
  compact: boolean;
  tooltipData: ReturnType<typeof buildRuntimeTooltip>;
  testIdSuffix: string;
}) {
  const chipTestId = resolveResourceTestId(testIdSuffix);
  return (
    <Tooltip content={<StarsilkTooltipContent data={tooltipData} testId={`tooltip-${testIdSuffix}`} compact />}>
      <div className="resource-item" data-testid={chipTestId}>
        <AssetIcon mechanicalKey={mechanicalKey} size={compact ? 16 : 20} className="resource-item__icon" />
        <span className="resource-item__value" style={{ color }}>{value}</span>
        {deltaStr && (
          <span className={`resource-item__delta ${deltaStr.startsWith('+') ? 'positive' : deltaStr.startsWith('-') ? 'negative' : ''}`}>
            {deltaStr}
          </span>
        )}
      </div>
    </Tooltip>
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
    ? STRATEGIC_KEYS
    : strategicResources
      ? STRATEGIC_KEYS.filter(key => strategicResources[key] > 0)
      : [];

  return (
    <div className={`resource-bar ${compact ? 'resource-bar--compact' : ''}`} data-testid="resource-bar">
      {CORE_RESOURCE_KEYS.map(key => {
        if (key === 'influence' && influence === undefined) return null;
        const value = key === 'influence' ? influence! : resources[key as keyof Resources];
        const delta = key !== 'influence' ? deltas?.[key as keyof Resources] : undefined;
        const deltaStr = delta !== undefined ? formatDelta(delta) : '';
        const mechanicalKey = `resource:${key}`;
        const tooltipData = key === 'influence'
          ? buildRuntimeTooltip(mechanicalKey, { value, delta: deltaStr || undefined })
          : buildEconomyRuntime(key as keyof Resources, value, deltaStr, economy);

        return (
          <ResourceItem
            key={key}
            mechanicalKey={mechanicalKey}
            value={value}
            deltaStr={deltaStr}
            color={RESOURCE_COLORS[key]}
            compact={compact}
            tooltipData={tooltipData}
            testIdSuffix={key}
          />
        );
      })}

      {visibleStrategic.map(key => {
        const income = strategicIncome?.[key] ?? 0;
        const incomeStr = income > 0 ? `+${income}/turn from colonies` : undefined;
        const tooltipData = buildRuntimeTooltip(`resource:${key}`, {
          value: strategicResources![key],
          incomeNote: incomeStr,
        });
        return (
          <ResourceItem
            key={key}
            mechanicalKey={`resource:${key}`}
            value={strategicResources![key]}
            deltaStr={income > 0 ? `+${income}/t` : ''}
            color={RESOURCE_COLORS[key]}
            compact={compact}
            tooltipData={tooltipData}
            testIdSuffix={key}
          />
        );
      })}

      {showStarsilkResources && starsilkResources && STARSILK_RESOURCE_KEYS.map(key => {
        const val = starsilkResources[key];
        if (val <= 0 && !(starsilkIncome?.[key] ?? 0)) return null;
        const income = starsilkIncome?.[key] ?? 0;
        const tooltipData = buildRuntimeTooltip(`resource:${key}`, {
          value: val,
          incomeNote: income > 0 ? `+${income}/turn from deposits/archives` : undefined,
        });
        return (
          <ResourceItem
            key={key}
            mechanicalKey={`resource:${key}`}
            value={val}
            deltaStr={income > 0 ? `+${income}/t` : ''}
            color={RESOURCE_COLORS[key]}
            compact={compact}
            tooltipData={tooltipData}
            testIdSuffix={key}
          />
        );
      })}
    </div>
  );
}