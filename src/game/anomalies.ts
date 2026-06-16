import { SeededRNG } from './rng';
import type { AnomalyExploreChoice, AnomalyType, Empire, GameState, SystemAnomaly } from './types';

const ANOMALY_TEMPLATES: { type: AnomalyType; name: string; description: string; loreSnippet?: string }[] = [
  { type: 'derelict', name: 'Derelict Starship', description: 'An ancient vessel drifts silently.' },
  { type: 'nebula', name: 'Dense Nebula', description: 'Strange energies swirl in the clouds.' },
  { type: 'asteroid_field', name: 'Rich Asteroid Field', description: 'Mineral-rich asteroids orbit the star.' },
  { type: 'ancient_ruins', name: 'Ancient Ruins', description: 'Remnants of a forgotten civilization.' },
  { type: 'wormhole', name: 'Unstable Wormhole', description: 'A tear in spacetime flickers nearby.' },
  { type: 'resource_cache', name: 'Resource Cache', description: 'A hidden supply depot floats in orbit.' },
  { type: 'dark_matter_cloud', name: 'Dark Matter Cloud', description: 'Exotic particles condense in the void.' },
  { type: 'signal_beacon', name: 'Ancient Signal Beacon', description: 'A repeating signal emanates from deep space.' },
  {
    type: 'precursor',
    name: 'Precursor Monument',
    description: 'A colossal structure predates all known civilizations.',
    loreSnippet: 'The glyphs speak of a galactic empire that vanished before the first star was charted. Their knowledge awaits the worthy.',
  },
];

const PRECURSOR_LORE = [
  'Fragments describe a network of jump gates spanning the galaxy.',
  'The monument hums with residual quantum energy — a warning or invitation?',
  'Star maps etched in unknown alloys reveal systems yet undiscovered.',
];

let anomalyCounter = 0;

function createAnomalyId(): string {
  return `anomaly-${anomalyCounter++}`;
}

export function resetAnomalyCounter(): void {
  anomalyCounter = 0;
}

export function generateAnomaly(rng: SeededRNG): SystemAnomaly {
  const template = rng.pick(ANOMALY_TEMPLATES);
  return {
    id: createAnomalyId(),
    type: template.type,
    name: template.name,
    description: template.description,
    explored: false,
    rewardClaimed: false,
    loreSnippet: template.loreSnippet ?? (template.type === 'precursor' ? rng.pick(PRECURSOR_LORE) : undefined),
  };
}

export function shouldGenerateAnomaly(rng: SeededRNG): boolean {
  return rng.next() < 0.25;
}

export function canExploreAnomaly(
  state: GameState,
  systemId: string,
  empireId: string
): string | null {
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return 'System not found';
  if (!system.anomaly) return 'No anomaly here';
  if (system.exploredBy[empireId]) return 'Already explored';
  const hasFleet = state.fleets.some(f => f.empireId === empireId && f.systemId === systemId);
  if (!hasFleet) return 'Need a fleet in system';
  return null;
}

function teleportFleetViaWormhole(
  state: GameState,
  systemId: string,
  empire: Empire,
  rng: SeededRNG
): void {
  const distantSystems = state.systems.filter(s => {
    if (s.id === systemId) return false;
    const sys = state.systems.find(x => x.id === systemId)!;
    const dist = Math.sqrt((s.x - sys.x) ** 2 + (s.y - sys.y) ** 2);
    return dist > 200;
  });

  if (distantSystems.length === 0) return;

  const target = rng.pick(distantSystems);
  const fleet = state.fleets.find(f => f.empireId === empire.id && f.systemId === systemId);
  if (fleet) {
    fleet.systemId = target.id;
    fleet.destinationSystemId = null;
    fleet.travelPath = [];
    fleet.travelTurns = 0;
    empire.knownSystems.add(target.id);
    empire.visibleSystems.add(target.id);
    state.events.push({
      turn: state.turn,
      type: 'anomaly',
      message: `${empire.name}'s fleet was teleported to ${target.name} via wormhole!`,
    });
  }
}

function applyAnomalyRewards(
  state: GameState,
  systemId: string,
  empire: Empire,
  anomaly: SystemAnomaly,
  rng: SeededRNG,
  multiplier: number
): void {
  switch (anomaly.type) {
    case 'derelict':
      empire.resources.science += Math.floor(15 * multiplier);
      empire.resources.credits += Math.floor(20 * multiplier);
      break;
    case 'nebula':
      empire.resources.science += Math.floor(25 * multiplier);
      break;
    case 'asteroid_field':
      empire.resources.industry += Math.floor(20 * multiplier);
      empire.resources.credits += Math.floor(15 * multiplier);
      break;
    case 'ancient_ruins':
      empire.resources.science += Math.floor(30 * multiplier);
      empire.influence += Math.floor(5 * multiplier);
      break;
    case 'wormhole':
      empire.influence += Math.floor(8 * multiplier);
      for (const connId of state.systems.find(s => s.id === systemId)!.connections) {
        empire.knownSystems.add(connId);
      }
      teleportFleetViaWormhole(state, systemId, empire, rng);
      break;
    case 'resource_cache':
      empire.resources.credits += Math.floor(40 * multiplier);
      empire.resources.food += Math.floor(15 * multiplier);
      break;
    case 'dark_matter_cloud':
      empire.strategicResources.darkmatter += Math.floor(2 * multiplier);
      empire.resources.science += Math.floor(20 * multiplier);
      break;
    case 'signal_beacon': {
      const beaconSystem = state.systems.find(s => s.id === systemId)!;
      empire.influence += Math.floor(10 * multiplier);
      empire.resources.science += Math.floor(15 * multiplier);
      for (const sys of state.systems) {
        if (Math.abs(sys.x - beaconSystem.x) < 150 && Math.abs(sys.y - beaconSystem.y) < 150) {
          empire.knownSystems.add(sys.id);
        }
      }
      break;
    }
    case 'precursor':
      empire.resources.science += Math.floor(40 * multiplier);
      empire.influence += Math.floor(12 * multiplier);
      empire.strategicResources.darkmatter += 1;
      if (anomaly.loreSnippet) {
        state.precursorLorePending = anomaly.loreSnippet;
        state.events.push({
          turn: state.turn,
          type: 'anomaly',
          message: `Precursor discovery: ${anomaly.name}`,
        });
      }
      break;
  }
}

export function exploreAnomaly(
  state: GameState,
  systemId: string,
  empire: Empire,
  rng: SeededRNG,
  choice: AnomalyExploreChoice = 'safe'
): boolean {
  if (choice === 'skip') return false;

  const err = canExploreAnomaly(state, systemId, empire.id);
  if (err) return false;

  const system = state.systems.find(s => s.id === systemId)!;
  const anomaly = system.anomaly!;
  system.exploredBy[empire.id] = true;
  anomaly.explored = true;

  const hasXenology = empire.researchedTechs.includes('xenology');
  let bonus = hasXenology ? 1.5 : 1;

  if (choice === 'risky') {
    if (rng.next() < 0.3) {
      empire.resources.credits = Math.max(0, empire.resources.credits - 15);
      state.events.push({
        turn: state.turn,
        type: 'anomaly',
        message: `${empire.name}'s risky exploration failed at ${anomaly.name}`,
      });
      anomaly.rewardClaimed = true;
      return true;
    }
    bonus *= 1.8;
  } else {
    bonus *= 1.0;
  }

  applyAnomalyRewards(state, systemId, empire, anomaly, rng, bonus);
  anomaly.rewardClaimed = true;
  state.events.push({
    turn: state.turn,
    type: 'anomaly',
    message: `${empire.name} explored ${anomaly.name} in ${system.name} (${choice})`,
  });
  return true;
}

export function getAnomalyRewardPreview(type: AnomalyType): string {
  switch (type) {
    case 'derelict': return 'Science + Credits';
    case 'nebula': return 'Science boost';
    case 'asteroid_field': return 'Industry + Credits';
    case 'ancient_ruins': return 'Science + Influence';
    case 'wormhole': return 'Influence + Teleport fleet';
    case 'resource_cache': return 'Credits + Food';
    case 'dark_matter_cloud': return 'Dark matter + Science';
    case 'signal_beacon': return 'Influence + Reveal nearby systems';
    case 'precursor': return 'Science + Influence + Lore';
  }
}