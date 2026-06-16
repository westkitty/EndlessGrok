import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeLedgerManifest, type LedgerAssetRecord } from './ledger';

export function loadLedgerManifest(manifestPath: string): LedgerAssetRecord[] {
  const raw = readFileSync(resolve(manifestPath), 'utf8');
  return normalizeLedgerManifest(JSON.parse(raw));
}