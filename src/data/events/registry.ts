import { getAssetById } from '../assets/runtimeManifest';
import { STARSILK_EVENT_RECORDS } from './records';
import type { EventCategory, StarsilkEventRecord } from './types';

const byId = new Map<string, StarsilkEventRecord>(
  STARSILK_EVENT_RECORDS.map(record => [record.id, record]),
);

const byCategory = new Map<EventCategory, StarsilkEventRecord[]>();

for (const record of STARSILK_EVENT_RECORDS) {
  const list = byCategory.get(record.category) ?? [];
  list.push(record);
  byCategory.set(record.category, list);
}

export interface EventValidationError {
  eventId: string;
  message: string;
}

export function getStarsilkEvent(id: string): StarsilkEventRecord | undefined {
  return byId.get(id);
}

export function getStarsilkEventsByCategory(category: EventCategory): StarsilkEventRecord[] {
  return byCategory.get(category) ?? [];
}

export function getAllStarsilkEvents(): StarsilkEventRecord[] {
  return [...STARSILK_EVENT_RECORDS];
}

export function validateStarsilkEvents(): EventValidationError[] {
  const errors: EventValidationError[] = [];
  const seenIds = new Set<string>();
  const seenTestIds = new Set<string>();
  const forbidden = /\b(spider|web|dragon)\b/i;

  for (const record of STARSILK_EVENT_RECORDS) {
    if (seenIds.has(record.id)) {
      errors.push({ eventId: record.id, message: 'Duplicate event id' });
    }
    seenIds.add(record.id);

    if (seenTestIds.has(record.testId)) {
      errors.push({ eventId: record.id, message: `Duplicate testId: ${record.testId}` });
    }
    seenTestIds.add(record.testId);

    const required = [record.title, record.body, record.triggerCondition, record.mechanicalEffect];
    if (required.some(field => !field?.trim())) {
      errors.push({ eventId: record.id, message: 'Missing required event field' });
    }

    if (record.options.length === 0) {
      errors.push({ eventId: record.id, message: 'Event requires at least one option' });
    }

    if (!getAssetById(record.assetId)) {
      errors.push({ eventId: record.id, message: `Manifest asset missing: ${record.assetId}` });
    }

    const blob = [record.title, record.body, ...record.options.map(o => o.label)].join(' ');
    if (forbidden.test(blob)) {
      errors.push({ eventId: record.id, message: 'Forbidden motif language in event' });
    }
  }

  return errors;
}