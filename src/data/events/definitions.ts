import { STARSILK_EVENT_RECORDS } from './records';
import type { EventDefinition, EventDefinitionCategory } from './eventDefinitionTypes';

const CATEGORY_MAP: Record<string, EventDefinitionCategory> = {
  exploration: 'anomalies',
  resource: 'resources',
  macro: 'macros',
  diplomacy: 'diplomacy',
  combat: 'combat',
  victory: 'victory',
};

const LOG_TYPE_MAP: Record<EventDefinitionCategory, EventDefinition['logType']> = {
  starbinding: 'starbinding',
  macros: 'macro',
  resources: 'event',
  diplomacy: 'diplomacy',
  anomalies: 'explore',
  victory: 'victory',
  combat: 'combat',
};

function recordToDefinition(record: (typeof STARSILK_EVENT_RECORDS)[number]): EventDefinition {
  const category = CATEGORY_MAP[record.category] ?? 'resources';
  const mechanicalTags = [record.category, record.severity, record.affectedScope];
  if (record.id.includes('heliocide')) mechanicalTags.push('irreversible');
  if (record.id.includes('starbinding')) mechanicalTags.push('catastrophic');

  return {
    id: record.id,
    title: record.title,
    category: record.id.includes('heliocide') || record.id.includes('starbinding-stage')
      ? 'starbinding'
      : category,
    trigger: record.triggerCondition,
    body: record.body,
    choices: record.options.map(opt => ({
      id: opt.id,
      label: opt.label,
      mechanicalEffect: opt.mechanicalEffect,
    })),
    effects: record.mechanicalEffect,
    severity: record.severity,
    sourceLabel: record.sourceLabel,
    mechanicalTags,
    relatedAssetIds: [record.assetId],
    testId: record.testId,
    canonSafetyNotes: record.id.includes('blood-ring')
      ? 'Atrocity-linked; never glamorize.'
      : record.id.includes('heliocide')
        ? 'Irreversible; report cost not triumph.'
        : undefined,
    logType: record.id.includes('heliocide') ? 'heliocide' : LOG_TYPE_MAP[category],
  };
}

const DISCOVERY_DEFINITIONS: EventDefinition[] = [
  {
    id: 'discovery-starsilk-thread',
    title: 'Starsilk Thread Isolated',
    category: 'resources',
    trigger: 'first_starsilkThread_gain',
    body: 'Reality-code strand logged. Handle with containment protocol.',
    choices: [{ id: 'ack', label: 'Acknowledge', mechanicalEffect: 'Flag first discovery' }],
    effects: 'First Starsilk Thread catalogued.',
    severity: 'high',
    sourceLabel: 'direct canon',
    mechanicalTags: ['discovery', 'starsilk', 'containment'],
    relatedAssetIds: ['resource-starsilk-thread'],
    testId: 'discovery-starsilk-thread',
    canonSafetyNotes: 'Not fuel. Containment problem.',
    logType: 'event',
  },
  {
    id: 'discovery-syrin-reagent',
    title: 'Syrin Reagent Catalogued',
    category: 'resources',
    trigger: 'first_syrinReagent_gain',
    body: 'Inerting chemistry confirmed.',
    choices: [{ id: 'ack', label: 'Acknowledge', mechanicalEffect: 'Flag first discovery' }],
    effects: 'First Syrin Reagent catalogued.',
    severity: 'medium',
    sourceLabel: 'direct canon',
    mechanicalTags: ['discovery', 'syrin', 'inerting'],
    relatedAssetIds: ['resource-syrin-reagent'],
    testId: 'discovery-syrin-reagent',
    logType: 'event',
  },
  {
    id: 'discovery-first-macro',
    title: 'First Macro Execution',
    category: 'macros',
    trigger: 'first_macro_executed',
    body: 'The universe accepted the loop.',
    choices: [{ id: 'ack', label: 'Acknowledge', mechanicalEffect: 'Flag first macro' }],
    effects: 'First macro execution logged.',
    severity: 'medium',
    sourceLabel: 'mechanical UI necessity',
    mechanicalTags: ['macro', 'execution'],
    relatedAssetIds: ['macro-syrin-inerting-mist'],
    testId: 'discovery-first-macro',
    logType: 'macro',
  },
  {
    id: 'starbinding-stage-advance',
    title: 'Starbinding Stage Advance',
    category: 'starbinding',
    trigger: 'starbinding_stage_increased',
    body: 'Stage label emitted from Starbinding progression.',
    choices: [{ id: 'ack', label: 'Acknowledge', mechanicalEffect: 'Log stage' }],
    effects: 'Starbinding stage counter incremented.',
    severity: 'high',
    sourceLabel: 'direct canon',
    mechanicalTags: ['starbinding', 'stage'],
    relatedAssetIds: ['victory-starbinding'],
    testId: 'starbinding-stage-advance',
    canonSafetyNotes: 'Never frame as clean triumph.',
    logType: 'starbinding',
  },
];

export const ALL_EVENT_DEFINITIONS: EventDefinition[] = [
  ...STARSILK_EVENT_RECORDS.map(recordToDefinition),
  ...DISCOVERY_DEFINITIONS,
];

export function getDefinitionsByCategory(category: EventDefinitionCategory): EventDefinition[] {
  return ALL_EVENT_DEFINITIONS.filter(def => def.category === category);
}