import type { AssetRecord } from '../types';

function fleetAsset(
  id: string,
  mechanicalKey: string,
  displayName: string,
  mechanical: string,
  lore: string,
  fallbackIconName: AssetRecord['fallbackIconName'],
  testId: string,
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
    testId,
    sourceBasis: 'fleet manager UI',
    status: 'planned',
    fallbackIconName,
    plannedFiles: { svg: `src/assets/icons/fleets/${id}.svg` },
  };
}

export const FLEET_ASSETS: AssetRecord[] = [
  fleetAsset('fleet-manager', 'fleet:manager', 'Fleet Manager', 'Fleet overview and movement control panel.', 'Operational syntax for deployed groups.', 'fleet', 'fleet-manager-icon'),
  fleetAsset('fleet-scout', 'fleet:scout', 'Explorer Fleet', 'Scout-dominant fleet with exploration bonus.', 'Light groups chart fogged lanes.', 'scout', 'fleet-role-scout'),
  fleetAsset('fleet-colony', 'fleet:colony', 'Colony Transport', 'Fleet carrying colonization capacity.', 'Population and infrastructure in transit.', 'colony', 'fleet-role-colony'),
  fleetAsset('fleet-military', 'fleet:military', 'Battle Fleet', 'Combat-dominant fleet.', 'Force applied as ledger argument.', 'cruiser', 'fleet-role-military'),
  fleetAsset('fleet-siege', 'fleet:siege', 'Siege Group', 'Heavy siege composition.', 'Lattice-breaking concentration.', 'dreadnought', 'fleet-role-siege'),
  fleetAsset('fleet-mixed', 'fleet:mixed', 'Task Force', 'Mixed scout and combat elements.', 'Expeditionary syntax.', 'frigate', 'fleet-role-mixed'),
  fleetAsset('fleet-civilian', 'fleet:civilian', 'Support Fleet', 'Non-combat logistics fleet.', 'Support mass without guns.', 'colony', 'fleet-role-civilian'),
  fleetAsset('fleet-stance-passive', 'fleet:stance-passive', 'Passive Stance', 'Fleet holds fire unless attacked.', 'Defensive posture.', 'stance-passive', 'fleet-stance-passive'),
  fleetAsset('fleet-stance-aggressive', 'fleet:stance-aggressive', 'Aggressive Stance', 'Fleet seeks engagement.', 'Offensive posture.', 'stance-aggressive', 'fleet-stance-aggressive'),
];