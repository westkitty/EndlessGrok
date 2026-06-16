import type { AssetRecord } from '../types';

const STARSILK_FACTIONS = [
  {
    id: 'faction-ledger-administration-emblem',
    slug: 'ledger-administration',
    name: 'Ledger Administration',
    motifs: 'Checksum audit bracket — clinical containment.',
  },
  {
    id: 'faction-drakken-genesis-host-emblem',
    slug: 'drakken-genesis-host',
    name: 'Drakken Genesis Host',
    motifs: 'Bio-geologic overwrite ring — not draconic.',
  },
  {
    id: 'faction-solidarity-cells-partition-front-emblem',
    slug: 'solidarity-cells-partition-front',
    name: 'Solidarity Cells / Partition Front',
    motifs: 'Partition lattice cross — disciplined rupture.',
  },
  {
    id: 'faction-syrin-survivor-enclave-emblem',
    slug: 'syrin-survivor-enclave',
    name: 'Syrin Survivor Enclave',
    motifs: 'Containment arc — preservation and inerting.',
  },
  {
    id: 'faction-archive-custodians-exhumed-cipher-emblem',
    slug: 'archive-custodians-exhumed-cipher',
    name: 'Archive Custodians / Exhumed Cipher',
    motifs: 'Archive prism stack — memory custody.',
  },
  {
    id: 'faction-containment-order-shard-god-emblem',
    slug: 'containment-order-shard-god',
    name: 'Containment Order / Shard-God',
    motifs: 'Cold procedural triangle — divine administration.',
  },
] as const;

export const STARSILK_FACTION_ASSETS: AssetRecord[] = STARSILK_FACTIONS.map(f => ({
  id: f.id,
  mechanicalKey: `faction:${f.id.slice('faction-'.length)}`,
  displayName: f.name,
  family: 'factions',
  states: ['default'],
  mechanicalMeaning: `Starsilk faction emblem for ${f.name}.`,
  loreMeaning: f.motifs,
  accessibilityLabel: `${f.name} emblem`,
  tooltip: {
    title: f.name,
    mechanical: 'Identifies faction ideology in diplomacy and intel surfaces.',
    lore: f.motifs,
    canonLabel: 'direct_canon',
  },
  testId: f.id,
  sourceBasis: 'direct canon',
  status: 'generated',
  fallbackIconName: 'emblem-terran',
  plannedFiles: { svg: `public/assets/icons/factions/${f.id}.svg` },
}));