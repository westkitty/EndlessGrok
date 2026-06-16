import type { AssetRecord } from '../types';

function mapAsset(
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
    family: 'map',
    states: ['visible', 'fogged'],
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
    sourceBasis: 'galaxy map states',
    status: 'generated',
    fallbackIconName: 'anomaly',
    plannedFiles: { svg: `public/assets/icons/map/${id}.svg` },
    ...rest,
  };
}

function ledgerMapAsset(
  id: string,
  mechanicalKey: string,
  displayName: string,
  mechanical: string,
  lore: string,
  extra: Partial<AssetRecord> = {},
): AssetRecord {
  return mapAsset(id, mechanicalKey, displayName, mechanical, lore, id, extra);
}

export const MAP_ASSETS: AssetRecord[] = [
  mapAsset('map-stable-star', 'map:stable', 'Stable Star', 'Standard navigable star with no active collapse.', 'Routine stellar syntax.', 'map-stable-star', {
    plannedFiles: { svg: 'public/assets/icons/map/map-star-normal.svg' },
  }),
  mapAsset('map-unstable-star', 'map:unstable', 'Unstable Star', 'Elevated hazard or pre-collapse instability.', 'Thread stress visible in spectral jitter.', 'map-unstable-star', {
    visualVariant: 'hazard',
    plannedFiles: { svg: 'public/assets/icons/map/map-hazard-unstable-star.svg' },
  }),
  mapAsset('map-starbinding-target', 'map:starbinding_targeted', 'Starbinding Target', 'System marked for archive dive / heliocide sequence.', 'Selected for Partition — diplomatic flashpoint.', 'map-starbinding-target', {
    fallbackIconName: 'combat',
    visualVariant: 'catastrophic',
    tooltip: {
      title: 'Starbinding Target',
      mechanical: 'Archive or dive target in active Starbinding sequence.',
      lore: 'The ledger marks this star for severance.',
      warning: 'Targeting escalates rival reactions.',
      canonLabel: 'direct_canon',
    },
  }),
  mapAsset('map-collapsing-star', 'map:collapsing', 'Collapsing Star', 'Heliocide in progress — irreversible.', 'Star dying under Partition math.', 'map-collapsing-star', {
    visualVariant: 'catastrophic',
    plannedFiles: { svg: 'public/assets/icons/map/map-hazard-unstable-star.svg' },
    tooltip: {
      title: 'Collapsing Star',
      mechanical: 'Active collapse. Fleet and population risk extreme.',
      lore: 'Heliocide cannot be appealed.',
      warning: 'Irreversible.',
      canonLabel: 'direct_canon',
    },
  }),
  mapAsset('map-collapsed-black-hole', 'map:collapsed_black_hole', 'Collapsed Black Hole', 'Post-heliocide singularity hazard system.', 'Ledgered void — navigation wound.', 'map-collapsed-black-hole', {
    visualVariant: 'hazard',
    plannedFiles: { svg: 'public/assets/icons/map/map-collapsed-star.svg' },
    tooltip: {
      title: 'Collapsed Black Hole',
      mechanical: 'Singularity hazard. Fleet losses on entry without protection.',
      lore: 'A star replaced by audited gravity.',
      warning: 'Unprotected travel is dangerous.',
      canonLabel: 'direct_canon',
    },
  }),
  mapAsset('map-singularity-hazard', 'map:singularity_hazard', 'Singularity Hazard', 'Fleet hazard applies in this system.', 'Thread geometry still bleeds.', 'map-singularity-hazard', {
    visualVariant: 'hazard',
    plannedFiles: { svg: 'public/assets/icons/map/map-hazard-singularity.svg' },
  }),
  mapAsset('map-hazard-suppressed', 'map:hazard_suppressed', 'Hazard Suppressed', 'Inerting mist reduces hazard in system.', 'Syrin containment field active.', 'map-hazard-suppressed', {
    fallbackIconName: 'research',
    visualVariant: 'inerting',
    plannedFiles: { svg: 'public/assets/icons/map/map-deposit-syrin-trace.svg' },
    tooltip: {
      title: 'Hazard Suppressed',
      mechanical: 'Reduced hazard — not removed.',
      lore: 'Inerting mist holds the bleed.',
      warning: 'Mitigation is not safety.',
      canonLabel: 'direct_canon',
    },
  }),
  mapAsset('map-singularity-sealed', 'map:singularity_sealed', 'Singularity Sealed', 'Gravity thread seal mitigates hazard.', 'Partition seal stitched locally.', 'map-singularity-sealed', {
    visualVariant: 'seal',
    plannedFiles: { svg: 'public/assets/icons/map/map-hazard-macro-sealed-system.svg' },
    tooltip: {
      title: 'Singularity Sealed',
      mechanical: 'Strongest mitigation tier active.',
      lore: 'Seal admits the wound remains.',
      warning: 'Still hazardous.',
      canonLabel: 'direct_canon',
    },
  }),
  mapAsset('map-strategic-deposit', 'map:strategic_deposit', 'Strategic Deposit', 'Planet bears Starsilk or strategic yield.', 'Local filament or remnant deposit.', 'map-strategic-deposit', {
    fallbackIconName: 'industry',
    plannedFiles: { svg: 'public/assets/icons/map/map-deposit-starsilk-leak.svg' },
  }),
  mapAsset('map-inerted-system', 'map:inerted_system', 'Inerted System', 'Counted toward Syrin Inerting containment.', 'System logged under containment index.', 'map-inerted-system', {
    fallbackIconName: 'research',
    visualVariant: 'inerting',
    plannedFiles: { svg: 'public/assets/icons/map/map-deposit-syrin-trace.svg' },
  }),
  mapAsset('map-archive-star', 'map:archive_star', 'Archive Star', 'Archive-linked star with data potential.', 'Stellar memory field — dive risk.', 'map-archive-star', {
    fallbackIconName: 'science',
    plannedFiles: { svg: 'public/assets/icons/map/map-deposit-archive-data.svg' },
  }),
  ledgerMapAsset('map-star-normal', 'map:star-normal', 'Normal Star', 'Standard navigable star.', 'Routine stellar syntax on the ledger map.', {}),
  ledgerMapAsset('map-collapsed-star', 'map:collapsed-star', 'Collapsed Star', 'Post-collapse singularity system.', 'Ledgered void — navigation wound.', { visualVariant: 'hazard' }),
  ledgerMapAsset('map-deposit-starsilk-leak', 'map:deposit-starsilk-leak', 'Starsilk Leak Deposit', 'Local Starsilk thread leak deposit.', 'Filament bleed at planetary scale.', { visualVariant: 'hazard' }),
  ledgerMapAsset('map-deposit-syrin-trace', 'map:deposit-syrin-trace', 'Syrin Trace Deposit', 'Syrin chemistry trace deposit.', 'Inerting precursor residue.', { visualVariant: 'inerting' }),
  ledgerMapAsset('map-deposit-blood-ring-glass', 'map:deposit-blood-ring-glass', 'Blood Ring Glass Deposit', 'Atrocity-linked vitrified deposit.', 'Red-black remnant field.', { visualVariant: 'catastrophic' }),
  ledgerMapAsset('map-deposit-siege-lattice-fragment', 'map:deposit-siege-lattice-fragment', 'Siege Lattice Deposit', 'Lattice shard deposit near singularity.', 'Containment geometry exposed.', { visualVariant: 'hazard' }),
  ledgerMapAsset('map-deposit-archive-data', 'map:deposit-archive-data', 'Archive Data Deposit', 'Archive light field deposit.', 'Stellar record traces.', {}),
  ledgerMapAsset('map-hazard-singularity', 'map:hazard-singularity', 'Singularity Hazard', 'Fleet hazard applies.', 'Thread geometry bleeds.', { visualVariant: 'hazard' }),
  ledgerMapAsset('map-hazard-unstable-star', 'map:hazard-unstable-star', 'Unstable Star Hazard', 'Pre-collapse instability.', 'Spectral jitter under thread stress.', { visualVariant: 'hazard' }),
  ledgerMapAsset('map-hazard-macro-sealed-system', 'map:hazard-macro-sealed-system', 'Macro Sealed System', 'Gravity thread seal active.', 'Partition seal stitched locally.', { visualVariant: 'seal' }),
  ledgerMapAsset('map-lane-normal', 'map:lane-normal', 'Normal Lane', 'Standard hyperlane.', 'Routine transit syntax.', {}),
  ledgerMapAsset('map-lane-unknown', 'map:lane-unknown', 'Unknown Lane', 'Unsurveyed lane segment.', 'Intel mask active.', {}),
  ledgerMapAsset('map-lane-blocked', 'map:lane-blocked', 'Blocked Lane', 'Transit blocked.', 'Chokepoint denial.', {}),
  ledgerMapAsset('map-lane-hazardous', 'map:lane-hazardous', 'Hazardous Lane', 'Elevated transit hazard.', 'Thread stress along lane.', { visualVariant: 'hazard' }),
  ledgerMapAsset('map-lane-sealed', 'map:lane-sealed', 'Sealed Lane', 'Seal geometry restricts transit.', 'Contained but not safe.', { visualVariant: 'seal' }),
  ledgerMapAsset('map-lane-hostile', 'map:lane-hostile', 'Hostile Lane', 'Hostile control or interdiction.', 'Transit under fire risk.', { visualVariant: 'catastrophic' }),
  ledgerMapAsset('map-fog-intel-mask', 'map:fog-intel-mask', 'Fog Intel Mask', 'Unsurveyed intel mask overlay.', 'Unknown until scanned.', {}),
];