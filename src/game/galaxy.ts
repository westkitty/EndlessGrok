import { GALAXY_SIZE, MIN_SYSTEM_DISTANCE, PLANET_TYPE_INFO, RARE_RESOURCE_TYPES, STAR_CLASS_COLORS, SYSTEM_COUNT } from './constants';
import { markArchiveStars } from './starbinding';
import { pickStarsilkDeposit } from './starsilkResources';
import { generateAnomaly, shouldGenerateAnomaly } from './anomalies';
import {
  applyPlanetFeatureOutputs,
  pickLuxuryResource,
  pickPlanetBlockers,
  pickPlanetModifiers,
  pickPlanetQuality,
} from './planets';
import { getGalaxyConfig } from './settings';
import { SeededRNG } from './rng';
import type { GalaxyShape, GalaxySizeOption, Planet, PlanetFocus, PlanetType, RareResource, StarSpectralClass, StarSystem, SystemType } from './types';

const SYSTEM_NAMES = [
  'Alpha Centauri', 'Proxima', 'Sirius', 'Vega', 'Rigel', 'Betelgeuse',
  'Antares', 'Pollux', 'Arcturus', 'Spica', 'Deneb', 'Altair',
  'Fomalhaut', 'Regulus', 'Capella', 'Aldebaran', 'Canopus', 'Achernar',
  'Hadar', 'Acrux', 'Mirach', 'Schedar', 'Caph', 'Alkaid',
  'Mizar', 'Alioth', 'Megrez', 'Dubhe', 'Merak', 'Phecda',
  'Zosma', 'Chara', 'Segin', 'Ruchbah', 'Navi', 'Sadr',
  'Alnath', 'Alnilam', 'Mintaka', 'Saiph', 'Bellatrix', 'Gacrux',
  'Kaus', 'Nunki', 'Peacock', 'Alnair', 'Suhail', 'Avior',
];

const PLANET_NAMES = [
  'Nova', 'Terra', 'Aurora', 'Cinder', 'Frost', 'Ember',
  'Haven', 'Drift', 'Pulse', 'Verdant', 'Ash', 'Crystal',
  'Dusk', 'Dawn', 'Rift', 'Hollow', 'Spire', 'Bastion',
];

const SPECTRAL_CLASSES: StarSpectralClass[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
const SPECTRAL_WEIGHTS = [0.02, 0.05, 0.08, 0.12, 0.20, 0.25, 0.28];

function generatePlanetId(systemIdx: number, planetIdx: number): string {
  return `p-${systemIdx}-${planetIdx}`;
}

function generateSystemId(idx: number): string {
  return `s-${idx}`;
}

function pickStarClass(rng: SeededRNG): StarSpectralClass {
  const roll = rng.next();
  let cumulative = 0;
  for (let i = 0; i < SPECTRAL_CLASSES.length; i++) {
    cumulative += SPECTRAL_WEIGHTS[i];
    if (roll < cumulative) return SPECTRAL_CLASSES[i];
  }
  return 'G';
}

function pickPlanetType(rng: SeededRNG, starClass: StarSpectralClass): PlanetType {
  const roll = rng.next();
  const hotStar = starClass === 'O' || starClass === 'B';
  const coolStar = starClass === 'K' || starClass === 'M';

  if (hotStar) {
    if (roll < 0.15) return 'terran';
    if (roll < 0.30) return 'volcanic';
    if (roll < 0.45) return 'barren';
    if (roll < 0.60) return 'toxic';
    if (roll < 0.75) return 'desert';
    if (roll < 0.90) return 'gas';
    return 'ice';
  }
  if (coolStar) {
    if (roll < 0.20) return 'terran';
    if (roll < 0.35) return 'ice';
    if (roll < 0.50) return 'ocean';
    if (roll < 0.65) return 'barren';
    if (roll < 0.80) return 'toxic';
    if (roll < 0.90) return 'desert';
    return 'gas';
  }
  if (roll < 0.22) return 'terran';
  if (roll < 0.36) return 'desert';
  if (roll < 0.50) return 'ocean';
  if (roll < 0.62) return 'ice';
  if (roll < 0.74) return 'volcanic';
  if (roll < 0.84) return 'toxic';
  if (roll < 0.92) return 'barren';
  return 'gas';
}

function getRichnessForStar(starClass: StarSpectralClass, rng: SeededRNG): number {
  const base: Record<StarSpectralClass, number> = {
    O: 1.3, B: 1.2, A: 1.1, F: 1.0, G: 1.0, K: 0.9, M: 0.8,
  };
  return Math.round((base[starClass] + rng.next() * 0.4 - 0.2) * 100) / 100;
}

function pickRareResource(rng: SeededRNG): RareResource {
  if (rng.next() > 0.22) return 'none';
  return rng.pick(RARE_RESOURCE_TYPES);
}

function createPlanet(
  systemId: string,
  systemIdx: number,
  planetIdx: number,
  rng: SeededRNG,
  richness: number,
  starClass: StarSpectralClass,
  systemType: SystemType
): Planet {
  const type = pickPlanetType(rng, starClass);
  const info = PLANET_TYPE_INFO[type];
  const habitability = systemType === 'black_hole' ? 0 : info.habitability;
  const basePop = habitability > 0 ? rng.nextInt(3, 8) : 0;

  const planet: Planet = {
    id: generatePlanetId(systemIdx, planetIdx),
    name: `${rng.pick(PLANET_NAMES)} ${planetIdx + 1}`,
    type,
    systemId,
    ownerId: null,
    population: 0,
    maxPopulation: Math.floor(basePop * 10 * habitability),
    foodOutput: Math.floor(rng.nextInt(2, 6) * info.foodMod * richness),
    industryOutput: Math.floor(rng.nextInt(1, 5) * info.industryMod * richness),
    scienceOutput: Math.floor(rng.nextInt(1, 4) * info.scienceMod * richness),
    minerals: Math.floor(rng.nextInt(1, 10) * richness),
    energy: Math.floor(rng.nextInt(1, 8) * richness),
    isColonized: false,
    happiness: 50,
    approval: 50,
    buildings: [],
    productionQueue: [],
    rareResource: pickRareResource(rng),
    focus: 'balanced' as PlanetFocus,
    isCapital: false,
    quality: pickPlanetQuality(rng),
    blockers: pickPlanetBlockers(rng),
    modifiers: pickPlanetModifiers(rng),
    luxuryResource: pickLuxuryResource(rng),
    developmentLevel: 1,
    terraformingProgress: 0,
  };

  applyPlanetFeatureOutputs(planet);
  return planet;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getShapePosition(
  index: number,
  total: number,
  mapSize: number,
  shape: GalaxyShape,
  rng: SeededRNG
): { x: number; y: number } {
  const cx = mapSize / 2;
  const cy = mapSize / 2;
  const margin = 60;
  const t = index / Math.max(total - 1, 1);

  switch (shape) {
    case 'spiral': {
      const arms = 3;
      const arm = index % arms;
      const armAngle = (arm / arms) * Math.PI * 2;
      const spiralAngle = t * Math.PI * 4 + armAngle;
      const radius = margin + t * (mapSize / 2 - margin * 2);
      const jitter = (rng.next() - 0.5) * 40;
      return {
        x: Math.round(cx + Math.cos(spiralAngle) * radius + jitter),
        y: Math.round(cy + Math.sin(spiralAngle) * radius + jitter),
      };
    }
    case 'cluster': {
      const clusters = 4;
      const clusterIdx = index % clusters;
      const clusterAngle = (clusterIdx / clusters) * Math.PI * 2;
      const clusterRadius = mapSize * 0.22;
      const clusterCx = cx + Math.cos(clusterAngle) * clusterRadius;
      const clusterCy = cy + Math.sin(clusterAngle) * clusterRadius;
      const localAngle = rng.next() * Math.PI * 2;
      const localRadius = rng.next() * (mapSize * 0.12);
      return {
        x: Math.round(Math.max(margin, Math.min(mapSize - margin, clusterCx + Math.cos(localAngle) * localRadius))),
        y: Math.round(Math.max(margin, Math.min(mapSize - margin, clusterCy + Math.sin(localAngle) * localRadius))),
      };
    }
    case 'ring': {
      const ringRadius = mapSize * 0.32;
      const angle = t * Math.PI * 2;
      const jitter = (rng.next() - 0.5) * 50;
      return {
        x: Math.round(cx + Math.cos(angle) * (ringRadius + jitter)),
        y: Math.round(cy + Math.sin(angle) * (ringRadius + jitter)),
      };
    }
    case 'elliptical': {
      const angle = t * Math.PI * 2 + rng.next() * 0.3;
      const rx = mapSize * 0.38;
      const ry = mapSize * 0.22;
      return {
        x: Math.round(cx + Math.cos(angle) * rx * (0.7 + rng.next() * 0.3)),
        y: Math.round(cy + Math.sin(angle) * ry * (0.7 + rng.next() * 0.3)),
      };
    }
    case 'sparse':
    default: {
      return {
        x: rng.nextInt(margin, mapSize - margin),
        y: rng.nextInt(margin, mapSize - margin),
      };
    }
  }
}

function buildConnections(systems: StarSystem[]): void {
  for (let i = 0; i < systems.length; i++) {
    const distances = systems
      .map((s, j) => ({ id: s.id, dist: i === j ? Infinity : distance(systems[i].x, systems[i].y, s.x, s.y) }))
      .sort((a, b) => a.dist - b.dist);

    const connections: string[] = [];
    for (const d of distances) {
      if (d.dist < Infinity && connections.length < 3) {
        connections.push(d.id);
      }
    }
    systems[i].connections = connections;
  }

  const visited = new Set<string>([systems[0].id]);
  const unvisited = new Set(systems.slice(1).map(s => s.id));

  while (unvisited.size > 0) {
    let bestFrom = '';
    let bestTo = '';
    let bestDist = Infinity;

    for (const vid of visited) {
      const vs = systems.find(s => s.id === vid)!;
      for (const uid of unvisited) {
        const us = systems.find(s => s.id === uid)!;
        const d = distance(vs.x, vs.y, us.x, us.y);
        if (d < bestDist) {
          bestDist = d;
          bestFrom = vid;
          bestTo = uid;
        }
      }
    }

    if (bestTo) {
      const fromSys = systems.find(s => s.id === bestFrom)!;
      const toSys = systems.find(s => s.id === bestTo)!;
      if (!fromSys.connections.includes(bestTo)) fromSys.connections.push(bestTo);
      if (!toSys.connections.includes(bestFrom)) toSys.connections.push(bestFrom);
      visited.add(bestTo);
      unvisited.delete(bestTo);
    } else break;
  }
}

export interface GalaxyConfig {
  systemCount: number;
  mapSize: number;
  minDistance: number;
}

export function generateGalaxy(
  seed: number,
  galaxySize: GalaxySizeOption = 'medium',
  galaxyShape: GalaxyShape = 'sparse'
): StarSystem[] {
  const config = getGalaxyConfig(galaxySize);
  const rng = new SeededRNG(seed);
  const systems: StarSystem[] = [];
  const names = rng.shuffle([...SYSTEM_NAMES]);
  const systemCount = config.systemCount;
  const mapSize = config.mapSize;
  const minDistance = galaxyShape === 'sparse' ? config.minDistance + 10 : config.minDistance;

  for (let i = 0; i < systemCount; i++) {
    let x = 0, y = 0, valid = false;
    let attempts = 0;

    while (!valid && attempts < 150) {
      const pos = getShapePosition(i, systemCount, mapSize, galaxyShape, rng);
      x = pos.x;
      y = pos.y;
      valid = systems.every(s => distance(s.x, s.y, x, y) >= minDistance);
      attempts++;
    }

    const starClass = pickStarClass(rng);
    const richness = getRichnessForStar(starClass, rng);
    const isBlackHole = i === 0 ? false : rng.next() < 0.05;
    const systemType: SystemType = isBlackHole ? 'black_hole' : 'normal';
    const planetCount = systemType === 'black_hole' ? rng.nextInt(0, 1) : rng.nextInt(1, 4);
    const systemId = generateSystemId(i);
    const planets: Planet[] = [];

    for (let j = 0; j < planetCount; j++) {
      planets.push(createPlanet(systemId, i, j, rng, richness, starClass, systemType));
    }

    const anomaly = shouldGenerateAnomaly(rng) ? generateAnomaly(rng) : null;

    systems.push({
      id: systemId,
      name: systemType === 'black_hole' ? `BH-${names[i % names.length]}` : names[i % names.length],
      x, y,
      planets,
      connections: [],
      starClass,
      richness: systemType === 'black_hole' ? richness * 1.5 : richness,
      anomaly,
      exploredBy: {},
      systemType,
      orbitalStationOwnerId: null,
      siegeBlockaders: [],
      specialization: null,
      starState: systemType === 'black_hole' ? 'collapsed_black_hole' : 'stable',
      isArchiveStar: false,
    });
  }

  buildConnections(systems);

  const depositRng = new SeededRNG(seed + 99173);
  for (const system of systems) {
    for (const planet of system.planets) {
      planet.starsilkDeposit = pickStarsilkDeposit(depositRng);
    }
  }

  const archiveRng = new SeededRNG(seed + 77117);
  markArchiveStars(systems, archiveRng);
  return systems;
}

export function getStarColor(starClass: StarSpectralClass): string {
  return STAR_CLASS_COLORS[starClass] ?? '#fff4ea';
}

export function getColonizablePlanets(systems: StarSystem[]): Planet[] {
  return systems.flatMap(s => s.planets.filter(p => PLANET_TYPE_INFO[p.type].habitability > 0));
}

export function getSystem(state: { systems: StarSystem[] }, systemId: string): StarSystem | undefined {
  return state.systems.find(s => s.id === systemId);
}

export function areSystemsConnected(systems: StarSystem[], fromId: string, toId: string): boolean {
  const from = systems.find(s => s.id === fromId);
  return from?.connections.includes(toId) ?? false;
}

export function getAdjacentSystems(systems: StarSystem[], systemId: string): StarSystem[] {
  const sys = systems.find(s => s.id === systemId);
  if (!sys) return [];
  return sys.connections.map(id => systems.find(s => s.id === id)!).filter(Boolean);
}

export function getSystemDistance(systems: StarSystem[], fromId: string, toId: string): number {
  const from = systems.find(s => s.id === fromId);
  const to = systems.find(s => s.id === toId);
  if (!from || !to) return Infinity;
  return distance(from.x, from.y, to.x, to.y);
}

/** Legacy export for tests using SYSTEM_COUNT */
export { SYSTEM_COUNT, GALAXY_SIZE, MIN_SYSTEM_DISTANCE };