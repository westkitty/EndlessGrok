export type StarsilkFactionId =
  | 'ledger-administration'
  | 'drakken-genesis-host'
  | 'solidarity-cells-partition-front'
  | 'syrin-survivor-enclave'
  | 'archive-custodians-exhumed-cipher'
  | 'containment-order-shard-god';

export interface StarsilkFactionRecord {
  id: StarsilkFactionId;
  name: string;
  visualMotifs: string[];
  aiPersonality: string;
  diplomacyStyle: string;
  victoryPreference: string;
  resourcePreference: string;
  aiTendencies: string[];
  emblemAssetId: string;
  tonePackAssetId: string;
  testId: string;
  status: 'prompted';
}