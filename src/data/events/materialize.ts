import type { GameEvent } from '../../game/types';
import type { EventDefinition } from './eventDefinitionTypes';

export function materializeEventLogEntry(
  definition: EventDefinition,
  turn: number,
): GameEvent {
  return {
    turn,
    type: definition.logType,
    message: `${definition.title}: ${definition.body}`,
    eventDefinitionId: definition.id,
  };
}