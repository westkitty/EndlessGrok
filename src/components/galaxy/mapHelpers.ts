import { findPath } from '../../game/travel';
import type { Empire, Fleet, GameState, StarSystem } from '../../game/types';

export interface GalaxyTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  mapSize: number;
  width: number;
  height: number;
}

export interface GalaxyViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export function getDefaultViewport(): GalaxyViewport {
  return { zoom: 1, panX: 0, panY: 0 };
}

export const SECTOR_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta'] as const;

export function computeGalaxyTransform(
  width: number,
  height: number,
  mapSize: number,
  viewport: GalaxyViewport,
): GalaxyTransform {
  const baseScale = Math.min(width, height) / (mapSize + 40);
  const scale = baseScale * viewport.zoom;
  const offsetX = (width - mapSize * scale) / 2 + viewport.panX;
  const offsetY = (height - mapSize * scale) / 2 + viewport.panY;
  return { scale, offsetX, offsetY, mapSize, width, height };
}

export function worldToScreen(
  x: number,
  y: number,
  transform: GalaxyTransform,
): { x: number; y: number } {
  return {
    x: transform.offsetX + x * transform.scale,
    y: transform.offsetY + y * transform.scale,
  };
}

export function screenToWorld(
  sx: number,
  sy: number,
  transform: GalaxyTransform,
): { x: number; y: number } {
  return {
    x: (sx - transform.offsetX) / transform.scale,
    y: (sy - transform.offsetY) / transform.scale,
  };
}

export function getSectorIndex(system: StarSystem, mapSize: number): number {
  const mid = mapSize / 2;
  const left = system.x < mid;
  const top = system.y < mid;
  if (!left && !top) return 0;
  if (left && !top) return 1;
  if (!left && top) return 2;
  return 3;
}

export function getSectorLabel(system: StarSystem, mapSize: number): string {
  return `${SECTOR_NAMES[getSectorIndex(system, mapSize)]} Sector`;
}

export function getSystemOwner(systemId: string, state: GameState): Empire | null {
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return null;
  const owners = new Set(system.planets.filter(p => p.ownerId).map(p => p.ownerId!));
  if (owners.size === 1) {
    return state.empires.find(e => e.id === [...owners][0]) || null;
  }
  return null;
}

export function isSystemContested(systemId: string, state: GameState): boolean {
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return false;
  const owners = new Set(system.planets.filter(p => p.ownerId && p.isColonized).map(p => p.ownerId!));
  if (owners.size > 1) return true;
  const ownerId = owners.size === 1 ? [...owners][0] : null;
  if (!ownerId) return false;
  return state.fleets.some(
    f => f.systemId === systemId && f.empireId !== ownerId && f.ships.some(s => s.attack > 0),
  );
}

export function isSystemSieged(system: StarSystem): boolean {
  return system.siegeBlockaders.length > 0;
}

export function hasColonizedPlanets(system: StarSystem): boolean {
  return system.planets.some(p => p.isColonized);
}

export function findSystemAtScreen(
  mx: number,
  my: number,
  state: GameState,
  playerId: string,
  transform: GalaxyTransform,
  hitRadius = 20,
): string | null {
  let closest: string | null = null;
  let closestDist = hitRadius;

  for (const system of state.systems) {
    const player = state.empires.find(e => e.id === playerId)!;
    if (!player.knownSystems.has(system.id) && !player.visibleSystems.has(system.id)) continue;
    const pos = worldToScreen(system.x, system.y, transform);
    const dist = Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2);
    if (dist < closestDist) {
      closestDist = dist;
      closest = system.id;
    }
  }

  return closest;
}

export function getFleetDestinationPath(state: GameState, fleet: Fleet): string[] {
  if (fleet.travelPath.length > 0) return fleet.travelPath;
  if (!fleet.destinationSystemId) return [];
  const path = findPath(state.systems, fleet.systemId, fleet.destinationSystemId);
  return path ?? [fleet.systemId, fleet.destinationSystemId];
}

export function getNebulaPaletteIndex(seed: number, regionX: number, regionY: number): number {
  const hash = Math.sin(seed * 0.17 + regionX * 0.31 + regionY * 0.47) * 43758.5453;
  return Math.abs(Math.floor(hash)) % 3;
}