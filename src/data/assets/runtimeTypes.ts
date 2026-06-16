import type { AssetFamily } from './types';
import type { LedgerAssetStatus, LedgerPlannedFiles } from './ledger';

export type SourceBasis =
  | 'direct canon'
  | 'canon-faithful adaptation'
  | 'interpretive adaptation'
  | 'mechanical UI necessity';

export type StarsilkAssetStatus = LedgerAssetStatus;

export interface AssetTooltip {
  title: string;
  mechanical: string;
  lore: string;
  warning?: string;
  uiNotes?: string;
}

export interface StarsilkAssetRecord {
  id: string;
  displayName: string;
  family: AssetFamily;
  filename: string;
  plannedPath: string;
  plannedFiles: LedgerPlannedFiles;
  states: string[];
  mechanicalMeaning: string;
  loreMeaning: string;
  accessibilityLabel: string;
  tooltip: AssetTooltip;
  testId: string;
  sourceBasis: SourceBasis;
  status: StarsilkAssetStatus;
  mechanicalKey: string;
}

export interface AssetManifestRuntime {
  version: string;
  recordCount: number;
  records: StarsilkAssetRecord[];
  byId: Map<string, StarsilkAssetRecord>;
  byFamily: Map<AssetFamily, StarsilkAssetRecord[]>;
  byStatus: Map<StarsilkAssetStatus, StarsilkAssetRecord[]>;
  bySourceBasis: Map<SourceBasis, StarsilkAssetRecord[]>;
  indexes: {
    resources: StarsilkAssetRecord[];
    victory: StarsilkAssetRecord[];
    factions: StarsilkAssetRecord[];
    events: StarsilkAssetRecord[];
    fleets: StarsilkAssetRecord[];
    ui: StarsilkAssetRecord[];
    audio: StarsilkAssetRecord[];
  };
}

export interface RuntimeValidationIssue {
  assetId: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}