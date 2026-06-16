import { getAssetById } from '../assets/runtimeManifest';
import { STARSILK_FACTION_RECORDS } from './records';
import type { StarsilkFactionId, StarsilkFactionRecord } from './types';

const byId = new Map<StarsilkFactionId, StarsilkFactionRecord>(
  STARSILK_FACTION_RECORDS.map(record => [record.id, record]),
);

export interface FactionValidationError {
  factionId: string;
  message: string;
}

export function getStarsilkFaction(id: StarsilkFactionId): StarsilkFactionRecord | undefined {
  return byId.get(id);
}

export function getAllStarsilkFactions(): StarsilkFactionRecord[] {
  return [...STARSILK_FACTION_RECORDS];
}

export function validateStarsilkFactions(): FactionValidationError[] {
  const errors: FactionValidationError[] = [];
  const seenIds = new Set<string>();
  const seenTestIds = new Set<string>();

  for (const record of STARSILK_FACTION_RECORDS) {
    if (seenIds.has(record.id)) {
      errors.push({ factionId: record.id, message: 'Duplicate faction id' });
    }
    seenIds.add(record.id);

    if (seenTestIds.has(record.testId)) {
      errors.push({ factionId: record.id, message: `Duplicate testId: ${record.testId}` });
    }
    seenTestIds.add(record.testId);

    if (!getAssetById(record.emblemAssetId)) {
      errors.push({ factionId: record.id, message: `Emblem asset missing: ${record.emblemAssetId}` });
    }

    if (!getAssetById(record.tonePackAssetId)) {
      errors.push({ factionId: record.id, message: `Tone pack asset missing: ${record.tonePackAssetId}` });
    }

    const forbidden = /dragon|spider|web/i;
    const blob = [record.name, record.aiPersonality, record.diplomacyStyle, ...record.visualMotifs].join(' ');
    if (forbidden.test(blob)) {
      errors.push({ factionId: record.id, message: 'Forbidden motif language in faction record' });
    }
  }

  return errors;
}