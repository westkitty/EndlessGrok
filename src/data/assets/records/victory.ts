import type { AssetRecord } from '../types';

function victoryAsset(
  id: string,
  mechanicalKey: string,
  displayName: string,
  mechanical: string,
  lore: string,
  testId: string,
  extra: Partial<AssetRecord> = {},
): AssetRecord {
  const { tooltip: tooltipOverride, ...rest } = extra;
  return {
    id,
    mechanicalKey,
    displayName,
    family: 'victory',
    states: ['locked', 'foundation', 'active', 'completable', 'completed'],
    mechanicalMeaning: mechanical,
    loreMeaning: lore,
    accessibilityLabel: displayName,
    tooltip: {
      title: displayName,
      mechanical,
      lore,
      canonLabel: 'canon_faithful',
      ...tooltipOverride,
    },
    testId,
    sourceBasis: 'victory systems',
    status: 'generated',
    fallbackIconName: 'research',
    plannedFiles: { svg: `public/assets/icons/victory/${id}.svg` },
    ...rest,
  };
}

export const VICTORY_ASSETS: AssetRecord[] = [
  victoryAsset(
    'victory-starbinding',
    'victory:starbinding',
    'The Starbinding',
    'Catastrophic Partition victory via heliocide dives, inert stabilization, and final macro execution.',
    'The sky is severed on purpose. No consensus was sought.',
    'victory-starbinding',
    {
      fallbackIconName: 'combat',
      visualVariant: 'catastrophic',
      tooltip: {
        title: 'The Starbinding',
        mechanical: 'Research chain → array → archive dives → heliocide → final Partition macro.',
        lore: 'A ledgered catastrophe sold as necessity.',
        warning: 'Irreversible. Morally compromised. Heliocide-linked. Not heroic.',
        requirements: ['Forbidden Starbinding Theory', 'Macro Execution', 'Archive access', 'Starsilk resources'],
        canonLabel: 'direct_canon',
      },
    },
  ),
  victoryAsset(
    'victory-syrin-inerting',
    'victory:syrinInerting',
    'Syrin Inerting',
    'Win by containing Starsilk hazards without executing Starbinding.',
    'Preservation through containment — not erasure, not forgiveness.',
    'victory-syrin-inerting',
    {
      fallbackIconName: 'research',
      visualVariant: 'inerting',
      tooltip: {
        title: 'Syrin Inerting',
        mechanical: 'Inert Starsilk threshold, protected systems, mist applications, zero player heliocide.',
        lore: 'Syrin chemistry holds the thread still while the galaxy argues about whether that counts as mercy.',
        canonLabel: 'direct_canon',
      },
    },
  ),
  victoryAsset(
    'victory-ledger-dominion',
    'victory:ledgerDominion',
    'Ledger Dominion',
    'Administration containment victory through influence hegemony and audits.',
    'Order imposed by checksum and vassal ledger.',
    'victory-ledger-dominion',
    {
      fallbackIconName: 'diplomacy',
      tooltip: {
        title: 'Ledger Dominion',
        mechanical: 'Foundation only: influence and territorial tracking. Vassalization audits not completable.',
        lore: 'The Administration dreams of a galaxy that signs every turn.',
        stateLabel: 'Foundation — not completable',
        canonLabel: 'interpretive',
      },
    },
  ),
  victoryAsset(
    'victory-blood-eclipse',
    'victory:bloodEclipse',
    'Blood Eclipse',
    'Drakken biosphere terraforming victory.',
    'Life rewritten under red ring light.',
    'victory-blood-eclipse',
    {
      fallbackIconName: 'combat',
      visualVariant: 'catastrophic',
      tooltip: {
        title: 'Blood Eclipse',
        mechanical: 'Foundation only: Blood Ring Glass and biosphere render tracked.',
        lore: 'Terraforming as conquest biology.',
        stateLabel: 'Foundation — not completable',
        canonLabel: 'canon_faithful',
      },
    },
  ),
  victoryAsset(
    'victory-archive-continuity',
    'victory:archiveContinuity',
    'Archive Continuity',
    'Preservation and research syntax victory.',
    'Memory kept against Partition pressure.',
    'victory-archive-continuity',
    {
      fallbackIconName: 'science',
      tooltip: {
        title: 'Archive Continuity',
        mechanical: 'Foundation only: Archive Data and research progress tracked.',
        lore: 'Continuity factions fear erasure more than stagnation.',
        stateLabel: 'Foundation — not completable',
        canonLabel: 'canon_faithful',
      },
    },
  ),
  victoryAsset(
    'victory-domination',
    'victory:domination',
    'Domination',
    'Control a threshold of colonizable worlds.',
    'Territorial fact enforced by fleet and colony count.',
    'victory-domination',
    {
      fallbackIconName: 'fleet',
      status: 'integrated',
      plannedFiles: { svg: 'src/assets/icons/victory/victory-domination.svg' },
    },
  ),
  victoryAsset(
    'victory-science',
    'victory:science',
    'Science',
    'Reach quantum computing and broad tech threshold.',
    'Syntax victory through research accumulation.',
    'victory-science',
    {
      fallbackIconName: 'science',
      status: 'integrated',
      plannedFiles: { svg: 'src/assets/icons/victory/victory-science.svg' },
    },
  ),
];