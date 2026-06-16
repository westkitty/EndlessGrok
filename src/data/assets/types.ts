import type { IconName } from '../../components/icons/iconHelpers';

export type AssetFamily =
  | 'resources'
  | 'victory'
  | 'map'
  | 'macros'
  | 'factions'
  | 'fleets'
  | 'planets'
  | 'ui'
  | 'audio'
  | 'events';

export type AssetStatus = 'planned' | 'spec_ready' | 'generated' | 'integrated' | 'deprecated';

export type CanonLabel = 'direct_canon' | 'canon_faithful' | 'interpretive';

export type AssetVisualVariant = 'default' | 'hazard' | 'seal' | 'counter' | 'inerting' | 'catastrophic';

export interface AssetTooltipSpec {
  title: string;
  mechanical: string;
  lore: string;
  warning?: string;
  requirements?: string[];
  costs?: string[];
  effects?: string[];
  stateLabel?: string;
  canonLabel?: CanonLabel;
}

export interface AssetRecord {
  id: string;
  mechanicalKey: string;
  displayName: string;
  family: AssetFamily;
  plannedFiles?: {
    svg?: string;
    png24?: string;
    png32?: string;
    png64?: string;
  };
  states: string[];
  mechanicalMeaning: string;
  loreMeaning: string;
  accessibilityLabel: string;
  tooltip: AssetTooltipSpec;
  testId: string;
  sourceBasis: string;
  status: AssetStatus;
  /** Resolved icon in iconHelpers when integrated */
  iconName?: IconName;
  /** Fallback when dedicated art is not yet integrated */
  fallbackIconName?: IconName;
  visualVariant?: AssetVisualVariant;
}

export interface RuntimeTooltipContext {
  value?: number;
  delta?: string;
  income?: number;
  expense?: number;
  net?: number;
  incomeNote?: string;
  invalidReason?: string;
  durationTurns?: number;
  cooldownTurns?: number;
  progressPct?: number;
  statusLabel?: string;
  warning?: string;
  requirements?: string[];
  costs?: string[];
  effects?: string[];
}