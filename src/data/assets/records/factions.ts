import type { AssetRecord } from '../types';

const EMBLEMS = ['terran', 'crimson', 'verdant', 'solar', 'void'] as const;

function emblemAsset(emblem: string): AssetRecord {
  const iconName = `emblem-${emblem}` as AssetRecord['iconName'];
  return {
    id: `faction-emblem-${emblem}`,
    mechanicalKey: `faction:emblem-${emblem}`,
    displayName: `${emblem.charAt(0).toUpperCase()}${emblem.slice(1)} Emblem`,
    family: 'factions',
    states: ['default'],
    mechanicalMeaning: `Faction emblem identifier for ${emblem} lineage.`,
    loreMeaning: 'Political syntax rendered as heraldry — not endorsement.',
    accessibilityLabel: `${emblem} faction emblem`,
    tooltip: {
      title: `${emblem} Emblem`,
      mechanical: 'Identifies empire faction in diplomacy and empire panels.',
      lore: 'Heraldry stamped on fleet and ledger correspondence.',
      canonLabel: 'interpretive',
    },
    testId: `faction-emblem-${emblem}`,
    sourceBasis: 'faction emblems',
    status: 'integrated',
    iconName,
    fallbackIconName: 'emblem-terran',
    plannedFiles: { svg: `src/assets/icons/factions/emblem-${emblem}.svg` },
  };
}

export const FACTION_ASSETS: AssetRecord[] = EMBLEMS.map(emblemAsset);