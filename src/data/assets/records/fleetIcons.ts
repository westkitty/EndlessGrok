import type { AssetRecord } from '../types';

function fleetIconAsset(
  id: string,
  mechanicalKey: string,
  displayName: string,
  mechanical: string,
  lore: string,
  fallbackIconName: AssetRecord['fallbackIconName'],
  extra: Partial<AssetRecord> = {},
): AssetRecord {
  return {
    id,
    mechanicalKey,
    displayName,
    family: 'fleets',
    states: ['default'],
    mechanicalMeaning: mechanical,
    loreMeaning: lore,
    accessibilityLabel: displayName,
    tooltip: { title: displayName, mechanical, lore, canonLabel: 'canon_faithful' },
    testId: id,
    sourceBasis: 'mechanical UI necessity',
    status: 'generated',
    fallbackIconName,
    plannedFiles: { svg: `public/assets/icons/fleets/${id}.svg` },
    ...extra,
  };
}

export const FLEET_ICON_ASSETS: AssetRecord[] = [
  fleetIconAsset('fleet-scout-icon', 'fleet:scout-icon', 'Fleet Scout Icon', 'Explorer fleet role marker.', 'Light groups chart fogged lanes.', 'scout'),
  fleetIconAsset('fleet-colony-icon', 'fleet:colony-icon', 'Fleet Colony Icon', 'Colonization transport role marker.', 'Population and infrastructure in transit.', 'colony'),
  fleetIconAsset('fleet-military-icon', 'fleet:military-icon', 'Fleet Military Icon', 'Combat-dominant fleet role marker.', 'Force applied as ledger argument.', 'cruiser'),
  fleetIconAsset('fleet-defense-icon', 'fleet:defense-icon', 'Fleet Defense Icon', 'Siege and defense fleet role marker.', 'Lattice-breaking concentration.', 'dreadnought'),
  fleetIconAsset('fleet-movement-trail', 'fleet:movement-trail', 'Fleet Movement Trail', 'Transit path overlay on the galaxy map.', 'Lane syntax traced in motion.', 'fleet', { visualVariant: 'default' }),
  fleetIconAsset('fleet-selected-marker', 'fleet:selected-marker', 'Fleet Selected Marker', 'Selection ring for active fleet.', 'Command focus on deployed group.', 'fleet'),
  fleetIconAsset('fleet-combat-risk-low', 'fleet:combat-risk-low', 'Fleet Combat Risk Low', 'Low engagement risk indicator.', 'Passive stance — holds fire unless attacked.', 'stance-passive'),
  fleetIconAsset('fleet-combat-risk-medium', 'fleet:combat-risk-medium', 'Fleet Combat Risk Medium', 'Moderate engagement risk indicator.', 'Cautious transit through contested lanes.', 'stance-passive'),
  fleetIconAsset('fleet-combat-risk-high', 'fleet:combat-risk-high', 'Fleet Combat Risk High', 'High engagement risk indicator.', 'Aggressive stance — seeks engagement.', 'stance-aggressive'),
];