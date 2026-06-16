import type { AssetTooltip } from '../assets/runtimeTypes';

export type StarsilkResourceKey =
  | 'archiveData'
  | 'starsilkThread'
  | 'bloodRingGlass'
  | 'siegeLatticeFragment'
  | 'checksumAlloy'
  | 'macroCatalyst'
  | 'syrinReagent'
  | 'obsidianPlate'
  | 'cinderCore'
  | 'gravityThread';

export interface StarsilkResourceRecord {
  key: StarsilkResourceKey;
  assetId: string;
  manifestAssetId: string;
  displayName: string;
  mechanicalMeaning: string;
  loreMeaning: string;
  tooltip: AssetTooltip;
  warning?: string;
  iconAssetId: string;
  testId: string;
  sourceBasis: 'direct canon' | 'canon-faithful adaptation' | 'mechanical UI necessity';
  status: 'prompted';
}