import starbindingJson from './starbinding.json' with { type: 'json' };
import macrosJson from './macros.json' with { type: 'json' };
import resourcesJson from './resources.json' with { type: 'json' };
import diplomacyJson from './diplomacy.json' with { type: 'json' };
import anomaliesJson from './anomalies.json' with { type: 'json' };
import victoryJson from './victory.json' with { type: 'json' };
import type { EventDefinition, EventDefinitionCategory } from './eventDefinitionTypes';

const CATEGORY_FILES: Record<EventDefinitionCategory, EventDefinition[]> = {
  starbinding: starbindingJson as EventDefinition[],
  macros: macrosJson as EventDefinition[],
  resources: resourcesJson as EventDefinition[],
  diplomacy: diplomacyJson as EventDefinition[],
  anomalies: anomaliesJson as EventDefinition[],
  victory: victoryJson as EventDefinition[],
  combat: [],
};

let cached: EventDefinition[] | null = null;

export function loadEventDefinitions(): EventDefinition[] {
  if (cached) return cached;
  cached = Object.values(CATEGORY_FILES).flat();
  return cached;
}

export function getEventDefinitionById(id: string): EventDefinition | undefined {
  return loadEventDefinitions().find(def => def.id === id);
}

export function getEventsByCategory(category: EventDefinitionCategory): EventDefinition[] {
  return CATEGORY_FILES[category] ?? [];
}

export interface EventValidationError {
  eventId: string;
  message: string;
}

const FORBIDDEN = /\b(spider|web|dragon|endless\s*space)\b/i;

export function validateEventDefinition(def: EventDefinition): EventValidationError[] {
  const errors: EventValidationError[] = [];
  const required: (keyof EventDefinition)[] = ['id', 'title', 'category', 'trigger', 'body', 'effects', 'severity', 'sourceLabel', 'testId'];
  for (const field of required) {
    if (!def[field]) errors.push({ eventId: def.id || '(missing)', message: `Missing ${field}` });
  }
  if (!def.choices?.length) errors.push({ eventId: def.id, message: 'choices required' });
  const blob = [def.title, def.body, ...def.choices.map(c => c.label)].join(' ');
  if (FORBIDDEN.test(blob)) errors.push({ eventId: def.id, message: 'Forbidden language' });
  return errors;
}

export function validateAllEventDefinitions(): EventValidationError[] {
  const errors: EventValidationError[] = [];
  const seenIds = new Set<string>();
  const seenTestIds = new Set<string>();
  for (const def of loadEventDefinitions()) {
    errors.push(...validateEventDefinition(def));
    if (seenIds.has(def.id)) errors.push({ eventId: def.id, message: 'Duplicate event id' });
    seenIds.add(def.id);
    if (seenTestIds.has(def.testId)) errors.push({ eventId: def.id, message: `Duplicate testId ${def.testId}` });
    seenTestIds.add(def.testId);
  }
  return errors;
}