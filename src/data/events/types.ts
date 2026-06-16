export type EventCategory =
  | 'exploration'
  | 'resource'
  | 'macro'
  | 'combat'
  | 'diplomacy'
  | 'victory';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EventOptionRecord {
  id: string;
  label: string;
  mechanicalEffect: string;
}

export interface StarsilkEventRecord {
  id: string;
  assetId: string;
  category: EventCategory;
  title: string;
  body: string;
  severity: EventSeverity;
  sourceLabel: string;
  triggerCondition: string;
  affectedScope: string;
  mechanicalEffect: string;
  options: EventOptionRecord[];
  testId: string;
  testFixture: string;
  status: 'prompted';
}