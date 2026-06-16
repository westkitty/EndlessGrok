import type { VictoryPathRecord, VictoryStageRecord } from './types';

function stage(
  assetId: string,
  pathId: VictoryStageRecord['pathId'],
  stageOrder: number,
  displayName: string,
  mechanical: string,
  lore: string,
  irreversible: boolean,
  warning?: string,
): VictoryStageRecord {
  return {
    id: assetId,
    assetId,
    pathId,
    stageOrder,
    displayName,
    mechanicalMeaning: mechanical,
    loreMeaning: lore,
    warning,
    irreversible,
    testId: assetId,
    status: 'prompted',
  };
}

const STARBINDING_STAGES: VictoryStageRecord[] = [
  stage('victory-starbinding-stage-forbidden-theory', 'starbinding', 1, 'Forbidden Theory', 'Catalogue forbidden Starbinding theory.', 'The ledger accepts the theory before morality does.', false),
  stage('victory-starbinding-stage-partition-mathematics', 'starbinding', 2, 'Partition Mathematics', 'Derive partition mathematics for array construction.', 'Geometry of rupture written as necessity.', false),
  stage('victory-starbinding-stage-syrin-inerting-method', 'starbinding', 3, 'Syrin Inerting Method', 'Acquire Syrin inerting stabilization method.', 'Containment chemistry bought against thread bleed.', false),
  stage('victory-starbinding-stage-worldsvault-array', 'starbinding', 4, 'Worldsvault Array', 'Construct Starbinding array at target system.', 'Array accepts no appeal once anchored.', false),
  stage('victory-starbinding-stage-target-selection', 'starbinding', 5, 'Target Selection', 'Select archive stars for dive sequence.', 'Targets chosen; diplomatic crisis accumulates.', false),
  stage('victory-starbinding-stage-heliocide-sequence', 'heliocide', 6, 'Heliocide Sequence', 'Execute heliocide dives on selected stars.', 'Stars collapse by procedure, not heroism.', true, 'Irreversible stellar collapse. Memory and lanes are destroyed.'),
  stage('victory-starbinding-stage-diplomatic-crisis', 'starbinding', 7, 'Diplomatic Crisis', 'Survive diplomatic crisis before final macro.', 'Allies fracture; containment factions escalate.', false, 'Relations may sever permanently.'),
  stage('victory-starbinding-stage-final-macro-execution', 'starbinding', 8, 'Final Macro Execution', 'Execute final Partition macro.', 'Sky severed on purpose. Not a clean triumph.', true, 'Morally compromised victory. Cost is permanent.'),
];

export const STARSILK_VICTORY_PATHS: VictoryPathRecord[] = [
  {
    id: 'starbinding',
    displayName: 'The Starbinding',
    assetId: 'victory-starbinding',
    mechanicalMeaning: 'Catastrophic Partition victory via heliocide dives, inert stabilization, and final macro execution.',
    loreMeaning: 'The sky is severed on purpose. No consensus was sought.',
    warning: 'Irreversible. Morally compromised. Heliocide-linked. Not heroic.',
    completable: true,
    stages: STARBINDING_STAGES,
    testId: 'victory-starbinding',
    status: 'prompted',
  },
  {
    id: 'archive-continuity',
    displayName: 'Archive Continuity',
    assetId: 'victory-archive-continuity',
    mechanicalMeaning: 'Preservation victory through Archive Data custody and research syntax thresholds.',
    loreMeaning: 'Memory kept against Partition pressure. Preservation remains morally ambiguous.',
    warning: 'Custody is not innocence. Records can be weaponized.',
    completable: false,
    stages: [
      stage('victory-archive-continuity', 'archive-continuity', 1, 'Archive Continuity', 'Foundation tracking for archive custody progress.', 'Continuity factions fear erasure more than stagnation.', false),
    ],
    testId: 'victory-archive-continuity',
    status: 'prompted',
  },
  {
    id: 'siege-custody',
    displayName: 'Siege Custody',
    assetId: 'victory-ledger-dominion',
    mechanicalMeaning: 'Containment victory through siege lattice anchoring and administrative custody.',
    loreMeaning: 'Order imposed by checksum, lattice anchors, and vassal ledger — cold containment, not conquest glamour.',
    warning: 'Custody admits the wound stays open. Singularity hazard remains.',
    completable: false,
    stages: [
      stage('victory-ledger-dominion', 'siege-custody', 1, 'Ledger Dominion Foundation', 'Influence hegemony and lattice containment tracked.', 'Administration dreams of a galaxy that signs every turn.', false),
      stage('macro-siege-lattice-anchor', 'siege-custody', 2, 'Lattice Anchoring', 'Siege lattice anchors chokepoints near singularities.', 'Lattice torn from siege geometry.', false, 'Fleet hazard remains after anchoring.'),
    ],
    testId: 'victory-ledger-dominion',
    status: 'prompted',
  },
  {
    id: 'heliocide',
    displayName: 'Heliocide',
    assetId: 'victory-starbinding-stage-heliocide-sequence',
    mechanicalMeaning: 'Irreversible stellar collapse stage within Starbinding.',
    loreMeaning: 'Stars collapsed by procedure. Ledgered singularities replace living light.',
    warning: 'Irreversible. Reports cost and instability, never triumph.',
    completable: false,
    stages: STARBINDING_STAGES.filter(s => s.pathId === 'heliocide'),
    testId: 'victory-starbinding-stage-heliocide-sequence',
    status: 'prompted',
  },
];