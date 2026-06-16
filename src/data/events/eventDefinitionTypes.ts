export type EventDefinitionCategory =
  | 'starbinding'
  | 'macros'
  | 'resources'
  | 'diplomacy'
  | 'anomalies'
  | 'victory'
  | 'combat';

export type EventDefinitionSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EventDefinitionChoice {
  id: string;
  label: string;
  mechanicalEffect: string;
}

export interface EventDefinition {
  id: string;
  title: string;
  category: EventDefinitionCategory;
  trigger: string;
  body: string;
  choices: EventDefinitionChoice[];
  effects: string;
  severity: EventDefinitionSeverity;
  sourceLabel: string;
  mechanicalTags: string[];
  relatedAssetIds: string[];
  testId: string;
  canonSafetyNotes?: string;
  logType: 'event' | 'diplomacy' | 'macro' | 'starbinding' | 'victory' | 'explore' | 'combat' | 'heliocide';
}