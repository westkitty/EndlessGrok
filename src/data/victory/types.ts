export type VictoryPathId =
  | 'starbinding'
  | 'archive-continuity'
  | 'siege-custody'
  | 'heliocide';

export interface VictoryStageRecord {
  id: string;
  assetId: string;
  pathId: VictoryPathId;
  stageOrder: number;
  displayName: string;
  mechanicalMeaning: string;
  loreMeaning: string;
  warning?: string;
  irreversible: boolean;
  threshold?: number;
  testId: string;
  status: 'prompted';
}

export interface VictoryPathRecord {
  id: VictoryPathId;
  displayName: string;
  assetId: string;
  mechanicalMeaning: string;
  loreMeaning: string;
  warning: string;
  completable: boolean;
  stages: VictoryStageRecord[];
  testId: string;
  status: 'prompted';
}