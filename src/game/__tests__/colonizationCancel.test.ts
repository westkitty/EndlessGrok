import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn } from '../game';
import { cancelColonizationAction, colonizePlanet } from '../actions';
import { getColonizationProjectForPlanet } from '../colonization';
import { exportSaveToJson, importSaveFromJson } from '../save';

function cloneState<T>(state: T): T {
  return structuredClone(state);
}

describe('colonization cancel', () => {
  it('creates progress when colonization starts', () => {
    const game = createNewGame(101, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    player.influence = 100;
    player.resources.credits = 500;
    player.resources.food = 200;

    const target = game.systems
      .flatMap(s => s.planets)
      .find(p => !p.isColonized && p.type === 'terran');

    if (!target) return;

    const connected = game.systems.find(s =>
      s.planets.some(p => p.ownerId === player.id) && s.connections.includes(target.systemId)
    );
    if (!connected) return;

    expect(colonizePlanet(game, target.id)).toBe(true);
    expect(getColonizationProjectForPlanet(game, target.id)).toBeDefined();
  });

  it('cancel removes progress and colonization does not complete', () => {
    const game = createNewGame(202, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    player.influence = 100;
    player.resources.credits = 500;
    player.resources.food = 200;

    const target = game.systems
      .flatMap(s => s.planets)
      .find(p => !p.isColonized && p.type === 'terran');
    if (!target) return;

    const connected = game.systems.find(s =>
      s.planets.some(p => p.ownerId === player.id) && s.connections.includes(target.systemId)
    );
    if (!connected) return;

    colonizePlanet(game, target.id);
    const project = getColonizationProjectForPlanet(game, target.id)!;
    expect(cancelColonizationAction(game, project.id)).toBe(true);
    expect(getColonizationProjectForPlanet(game, target.id)).toBeUndefined();

    let state = cloneState(game);
    for (let i = 0; i < 5; i++) {
      state = endTurn(state);
    }
    const planet = state.systems.flatMap(s => s.planets).find(p => p.id === target.id)!;
    expect(planet.isColonized).toBe(false);
  });

  it('persists colonization progress through save/load', () => {
    const game = createNewGame(303, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    player.influence = 100;
    player.resources.credits = 500;
    player.resources.food = 200;

    const target = game.systems
      .flatMap(s => s.planets)
      .find(p => !p.isColonized && p.type === 'terran');
    if (!target) return;

    const connected = game.systems.find(s =>
      s.planets.some(p => p.ownerId === player.id) && s.connections.includes(target.systemId)
    );
    if (!connected) return;

    colonizePlanet(game, target.id);
    const loaded = importSaveFromJson(exportSaveToJson(game)).state!;
    expect(loaded.colonizationProjects?.length).toBe(1);
    const project = loaded.colonizationProjects![0];
    expect(cancelColonizationAction(loaded, project.id)).toBe(true);
    expect(loaded.colonizationProjects?.length ?? 0).toBe(0);
  });
});