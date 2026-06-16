import {
  BOMBARDMENT_POP_LOSS,
  FLEET_COMMAND_BASE,
  FLEET_COMMAND_PER_TECH,
  RETREAT_SURVIVOR_RATIO,
  SALVAGE_CREDITS_PER_SHIP,
  VETERAN_BATTLE_THRESHOLD,
  VETERAN_COMBAT_BONUS,
} from './constants';
import { getSystemDefenseBonus, systemHasOrbitalStation } from './buildings';
import { addWarScore, areAtWar } from './diplomacy';
import { getTraitBonuses } from './traits';
import { hasUnlock } from './research';
import { countShipsByType, getFleetPower, getWeaponDefenseModifier } from './ships';
import { SeededRNG } from './rng';
import type { BattleReport, CombatPrediction, Empire, Fleet, GameState, Ship, ShipLossDetail, ShipType, StarSystem } from './types';

function getCombatBonuses(empire: Empire, fleet?: Fleet): { attack: number; defense: number } {
  let attack = 1;
  let defense = 1;
  if (hasUnlock(empire.researchedTechs, 'lasers')) attack += 0.15;
  if (hasUnlock(empire.researchedTechs, 'shields')) defense += 0.15;
  if (hasUnlock(empire.researchedTechs, 'planetary_shield')) defense += 0.1;
  attack *= getTraitBonuses(empire.trait).militaryAttackMod;
  if (fleet?.isVeteran || (fleet?.battleCount ?? 0) >= VETERAN_BATTLE_THRESHOLD) {
    attack *= 1 + VETERAN_COMBAT_BONUS;
    defense *= 1 + VETERAN_COMBAT_BONUS;
  }
  return { attack, defense };
}

export function getFleetCommandLimit(empire: Empire): number {
  let limit = FLEET_COMMAND_BASE;
  if (hasUnlock(empire.researchedTechs, 'fleet_command')) {
    limit += FLEET_COMMAND_PER_TECH;
  }
  if (hasUnlock(empire.researchedTechs, 'carrier_design')) {
    limit += 2;
  }
  return limit;
}

export function getSystemDefenseRating(state: GameState, system: StarSystem, ownerId: string): number {
  const planets = system.planets.filter(p => p.ownerId === ownerId && p.isColonized);
  const hasOrbital = system.orbitalStationOwnerId === ownerId || systemHasOrbitalStation(planets);
  const buildingDefense = getSystemDefenseBonus(planets, hasOrbital);

  const empire = state.empires.find(e => e.id === ownerId);
  let fleetDefense = 0;
  if (empire) {
    for (const fleet of state.fleets.filter(f => f.systemId === system.id && f.empireId === ownerId)) {
      const bonuses = getCombatBonuses(empire, fleet);
      const power = getFleetPower(
        fleet.ships.filter(s => s.type !== 'colony'),
        bonuses.attack,
        bonuses.defense
      );
      fleetDefense += power.defense + Math.floor(power.totalHp / 20);
    }
  }

  return Math.round(buildingDefense + fleetDefense);
}

export function getEmpireMilitaryPower(state: GameState, empireId: string): number {
  const empire = state.empires.find(e => e.id === empireId);
  const fleets = state.fleets.filter(f => f.empireId === empireId);
  let power = 0;
  for (const fleet of fleets) {
    const bonuses = getCombatBonuses(empire!, fleet);
    const fp = getFleetPower(fleet.ships, bonuses.attack, bonuses.defense);
    power += fp.attack + fp.defense + Math.floor(fp.totalHp / 10);
  }
  return power;
}

export function predictCombatOutcome(
  state: GameState,
  attackerFleet: Fleet,
  defenderFleet: Fleet,
  systemId: string
): CombatPrediction {
  const attacker = state.empires.find(e => e.id === attackerFleet.empireId)!;
  const defender = state.empires.find(e => e.id === defenderFleet.empireId)!;
  const atkBonuses = getCombatBonuses(attacker, attackerFleet);
  const defBonuses = getCombatBonuses(defender, defenderFleet);

  const system = state.systems.find(s => s.id === systemId)!;
  const defPlanets = system.planets.filter(p => p.ownerId === defender.id);
  const hasOrbital = system.orbitalStationOwnerId === defender.id || systemHasOrbitalStation(defPlanets);
  const defenseGridBonus = getSystemDefenseBonus(defPlanets, hasOrbital);
  defBonuses.defense += defenseGridBonus * 0.02;

  const atkShips = attackerFleet.ships.filter(s => s.type !== 'colony');
  const defShips = defenderFleet.ships.filter(s => s.type !== 'colony');
  const atkPower = getFleetPower(atkShips, atkBonuses.attack, atkBonuses.defense);
  const defPower = getFleetPower(defShips, defBonuses.attack, defBonuses.defense);

  const total = atkPower.attack + defPower.attack + 1;
  const attackerWinChance = Math.round((atkPower.attack / total) * 100);
  const estimatedRounds = Math.max(1, Math.ceil((atkPower.totalHp + defPower.totalHp) / (atkPower.attack + defPower.attack + 1)));

  return { attackerWinChance, estimatedRounds, attackerPower: atkPower.attack, defenderPower: defPower.attack };
}

function computeShipLosses(initial: Ship[], remaining: Ship[]): ShipLossDetail[] {
  const initialCounts = countShipsByType(initial);
  const remainingCounts = countShipsByType(remaining);
  const losses: ShipLossDetail[] = [];
  for (const type of Object.keys(initialCounts) as ShipType[]) {
    const lost = initialCounts[type] - remainingCounts[type];
    if (lost > 0) losses.push({ type, count: lost });
  }
  return losses;
}

function resolveRound(
  attackerShips: Ship[],
  defenderShips: Ship[],
  atkBonus: number,
  defBonus: number,
  rng: SeededRNG
): { attackerShips: Ship[]; defenderShips: Ship[]; log: string[] } {
  const log: string[] = [];
  const atkPower = getFleetPower(attackerShips, atkBonus, 1);
  const defPower = getFleetPower(defenderShips, 1, defBonus);

  let atkDamage = Math.max(1, Math.floor(atkPower.attack * (0.8 + rng.next() * 0.4) - defPower.defense * 0.3));
  let defDamage = Math.max(1, Math.floor(defPower.attack * (0.8 + rng.next() * 0.4) - atkPower.defense * 0.3));

  if (attackerShips[0] && defenderShips[0]) {
    const wMod = getWeaponDefenseModifier(
      attackerShips[0].weaponType ?? 'kinetic',
      defenderShips[0].defenseType ?? 'armor'
    );
    atkDamage = Math.floor(atkDamage * wMod);
  }

  let remainingDefDmg = atkDamage;
  const newDefender = defenderShips.map(s => ({ ...s }));
  while (remainingDefDmg > 0 && newDefender.length > 0) {
    const target = newDefender[0];
    const dmg = Math.min(remainingDefDmg, target.hp);
    target.hp -= dmg;
    remainingDefDmg -= dmg;
    if (target.hp <= 0) {
      log.push(`Defender ${target.type} destroyed`);
      newDefender.shift();
    }
  }

  let remainingAtkDmg = defDamage;
  const newAttacker = attackerShips.map(s => ({ ...s }));
  while (remainingAtkDmg > 0 && newAttacker.length > 0) {
    const target = newAttacker[0];
    const dmg = Math.min(remainingAtkDmg, target.hp);
    target.hp -= dmg;
    remainingAtkDmg -= dmg;
    if (target.hp <= 0) {
      log.push(`Attacker ${target.type} destroyed`);
      newAttacker.shift();
    }
  }

  return { attackerShips: newAttacker, defenderShips: newDefender, log };
}

function isSurrounded(state: GameState, systemId: string, empireId: string): boolean {
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return false;
  const enemyNeighbors = system.connections.filter(connId => {
    return state.fleets.some(f =>
      f.systemId === connId &&
      f.empireId !== empireId &&
      f.ships.some(s => s.attack > 0)
    );
  });
  return enemyNeighbors.length >= 2;
}

function applyRetreat(
  _loserFleet: Fleet,
  surrounded: boolean,
  initialShips: Ship[],
  remainingShips: Ship[]
): { ships: Ship[]; retreated: boolean } {
  if (surrounded || remainingShips.length === 0) {
    return { ships: remainingShips, retreated: false };
  }
  const survivorCount = Math.max(1, Math.floor(initialShips.length * RETREAT_SURVIVOR_RATIO));
  return { ships: remainingShips.slice(0, survivorCount), retreated: true };
}

function updateWarScore(state: GameState, winnerId: string, loserId: string, points: number): void {
  const winner = state.empires.find(e => e.id === winnerId);
  const loser = state.empires.find(e => e.id === loserId);
  if (!winner || !loser) return;
  addWarScore(winner, loserId, points);
  addWarScore(loser, winnerId, -points);
}

function applyBombardment(state: GameState, systemId: string, attackerId: string, defenderId: string): number {
  const attacker = state.empires.find(e => e.id === attackerId)!;
  const defender = state.empires.find(e => e.id === defenderId)!;
  if (!areAtWar(attacker, defender)) return 0;

  const system = state.systems.find(s => s.id === systemId)!;
  const hasAttackerFleet = state.fleets.some(f =>
    f.empireId === attackerId && f.systemId === systemId && f.ships.some(s => s.attack > 0)
  );
  if (!hasAttackerFleet) return 0;

  let totalDamage = 0;
  for (const planet of system.planets) {
    if (planet.ownerId === defenderId && planet.isColonized && planet.population > 0) {
      const loss = Math.min(planet.population, BOMBARDMENT_POP_LOSS);
      planet.population -= loss;
      totalDamage += loss;
    }
  }
  return totalDamage;
}

export function repairFleetAtSystem(
  state: GameState,
  fleetId: string,
  empire: Empire
): boolean {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet || fleet.empireId !== empire.id) return false;

  const ownsSystem = state.systems
    .find(s => s.id === fleet.systemId)
    ?.planets.some(p => p.ownerId === empire.id);
  if (!ownsSystem) return false;

  let repairCost = 0;
  for (const ship of fleet.ships) {
    if (ship.hp < ship.maxHp) {
      repairCost += Math.ceil((ship.maxHp - ship.hp) * 0.5);
    }
  }
  if (repairCost === 0 || empire.resources.industry < repairCost) return false;

  empire.resources.industry -= repairCost;
  for (const ship of fleet.ships) {
    ship.hp = ship.maxHp;
  }
  return true;
}

export function resolveCombat(
  state: GameState,
  systemId: string,
  attackerFleet: Fleet,
  defenderFleet: Fleet,
  rng: SeededRNG
): BattleReport {
  const attacker = state.empires.find(e => e.id === attackerFleet.empireId)!;
  const defender = state.empires.find(e => e.id === defenderFleet.empireId)!;
  const atkBonuses = getCombatBonuses(attacker, attackerFleet);
  const defBonuses = getCombatBonuses(defender, defenderFleet);

  const system = state.systems.find(s => s.id === systemId)!;
  const defPlanets = system.planets.filter(p => p.ownerId === defender.id);
  const hasOrbital = system.orbitalStationOwnerId === defender.id || systemHasOrbitalStation(defPlanets);
  const defenseGridBonus = getSystemDefenseBonus(defPlanets, hasOrbital);
  defBonuses.defense += defenseGridBonus * 0.02;

  let atkShips = attackerFleet.ships.map(s => ({ ...s }));
  let defShips = defenderFleet.ships.filter(s => s.type !== 'colony').map(s => ({ ...s }));
  const initialAtkShips = atkShips.map(s => ({ ...s }));
  const initialDefShips = defShips.map(s => ({ ...s }));

  const atkPower = getFleetPower(initialAtkShips, atkBonuses.attack, atkBonuses.defense);
  const defPower = getFleetPower(initialDefShips, defBonuses.attack, defBonuses.defense);

  const allLog: string[] = [
    `Battle at ${systemId}: ${attacker.name} vs ${defender.name}`,
    `Attacker power: ${atkPower.attack} ATK / ${atkPower.defense} DEF / ${atkPower.totalHp} HP`,
    `Defender power: ${defPower.attack} ATK / ${defPower.defense} DEF / ${defPower.totalHp} HP`,
  ];

  let rounds = 0;
  while (atkShips.length > 0 && defShips.length > 0 && rounds < 10) {
    allLog.push(`--- Round ${rounds + 1} ---`);
    const round = resolveRound(atkShips, defShips, atkBonuses.attack, defBonuses.defense, rng);
    atkShips = round.attackerShips;
    defShips = round.defenderShips;
    allLog.push(...round.log);
    rounds++;
  }

  let winnerId = atkShips.length > 0 && defShips.length === 0
    ? attacker.id
    : defShips.length > 0 && atkShips.length === 0
      ? defender.id
      : atkShips.length >= defShips.length
        ? attacker.id
        : defender.id;

  let retreated = false;
  const loserFleet = winnerId === attacker.id ? defenderFleet : attackerFleet;
  const loserShips = winnerId === attacker.id ? defShips : atkShips;
  const loserInitial = winnerId === attacker.id ? initialDefShips : initialAtkShips;
  const surrounded = isSurrounded(state, systemId, loserFleet.empireId);

  if (loserShips.length > 0 && loserShips.length < loserInitial.length) {
    const retreat = applyRetreat(loserFleet, surrounded, loserInitial, loserShips);
    if (retreat.retreated) {
      retreated = true;
      if (winnerId === attacker.id) {
        defShips = retreat.ships;
        winnerId = defShips.length === 0 ? attacker.id : defender.id;
      } else {
        atkShips = retreat.ships;
        winnerId = atkShips.length === 0 ? defender.id : attacker.id;
      }
      allLog.push(`Loser retreated with ${Math.ceil(loserInitial.length * RETREAT_SURVIVOR_RATIO)} survivors`);
    }
  }

  const loserId = winnerId === attacker.id ? defender.id : attacker.id;
  const loserLosses = winnerId === attacker.id ? initialDefShips.length - defShips.length : initialAtkShips.length - atkShips.length;
  const salvageCredits = loserLosses * SALVAGE_CREDITS_PER_SHIP;
  const winner = state.empires.find(e => e.id === winnerId)!;
  winner.resources.credits += salvageCredits;

  updateWarScore(state, winnerId, loserId, 10 + loserLosses * 2);
  const bombardmentDamage = applyBombardment(state, systemId, winnerId, loserId);

  attackerFleet.battleCount = (attackerFleet.battleCount ?? 0) + 1;
  defenderFleet.battleCount = (defenderFleet.battleCount ?? 0) + 1;
  if ((attackerFleet.battleCount ?? 0) >= VETERAN_BATTLE_THRESHOLD) attackerFleet.isVeteran = true;
  if ((defenderFleet.battleCount ?? 0) >= VETERAN_BATTLE_THRESHOLD) defenderFleet.isVeteran = true;

  allLog.push(`Victor: ${state.empires.find(e => e.id === winnerId)?.name} (${rounds} rounds)`);
  if (salvageCredits > 0) allLog.push(`Salvage: +${salvageCredits} credits`);
  if (bombardmentDamage > 0) allLog.push(`Bombardment caused ${bombardmentDamage} population loss`);

  return {
    systemId,
    attackerId: attacker.id,
    defenderId: defender.id,
    winnerId,
    attackerLosses: initialAtkShips.length - atkShips.length,
    defenderLosses: initialDefShips.length - defShips.length,
    attackerPower: atkPower.attack,
    defenderPower: defPower.attack,
    attackerShipLosses: computeShipLosses(initialAtkShips, atkShips),
    defenderShipLosses: computeShipLosses(initialDefShips, defShips),
    rounds,
    log: allLog,
    retreated,
    salvageCredits,
    bombardmentDamage,
  };
}

export function applyCombatResult(state: GameState, result: BattleReport, fleetA: Fleet, fleetB: Fleet): void {
  const winnerIsA = result.winnerId === fleetA.empireId;
  const winnerFleet = winnerIsA ? fleetA : fleetB;
  const loserFleet = winnerIsA ? fleetB : fleetA;

  if (result.retreated && loserFleet.ships.length > 0) {
    const winnerShips = winnerIsA ? fleetA.ships : fleetB.ships.filter(s => s.type !== 'colony');
    const loserShipCount = result.retreated
      ? Math.max(1, Math.floor((winnerIsA ? result.defenderLosses : result.attackerLosses) > 0
        ? loserFleet.ships.length
        : loserFleet.ships.length))
      : 0;

    if (winnerIsA) {
      fleetA.ships = fleetA.ships.slice(0, fleetA.ships.length - result.attackerLosses);
      const survivors = Math.max(1, Math.floor(fleetB.ships.filter(s => s.type !== 'colony').length * RETREAT_SURVIVOR_RATIO));
      fleetB.ships = fleetB.ships.filter(s => s.type !== 'colony').slice(0, survivors);
      if (fleetB.ships.length === 0) {
        state.fleets = state.fleets.filter(f => f.id !== fleetB.id);
      }
    } else {
      const survivors = Math.max(1, Math.floor(fleetA.ships.length * RETREAT_SURVIVOR_RATIO));
      fleetA.ships = fleetA.ships.slice(0, survivors);
      fleetB.ships = fleetB.ships.filter(s => s.type !== 'colony').slice(result.defenderLosses);
      if (fleetA.ships.length === 0) {
        state.fleets = state.fleets.filter(f => f.id !== fleetA.id);
      }
    }
    void winnerShips;
    void loserShipCount;
    return;
  }

  if (winnerIsA) {
    fleetA.ships = fleetA.ships.slice(result.attackerLosses);
  } else {
    fleetB.ships = fleetB.ships.filter(s => s.type !== 'colony').slice(result.defenderLosses);
  }

  state.fleets = state.fleets.filter(f => f.id !== loserFleet.id);

  if (winnerFleet.ships.length === 0) {
    state.fleets = state.fleets.filter(f => f.id !== winnerFleet.id);
  }
}

export function checkAndResolveBattles(state: GameState, rng: SeededRNG): void {
  const battlesBySystem = new Map<string, Fleet[]>();

  for (const fleet of state.fleets) {
    const existing = battlesBySystem.get(fleet.systemId) || [];
    existing.push(fleet);
    battlesBySystem.set(fleet.systemId, existing);
  }

  for (const [systemId, fleets] of battlesBySystem) {
    const byEmpire = new Map<string, Fleet[]>();
    for (const f of fleets) {
      const list = byEmpire.get(f.empireId) || [];
      list.push(f);
      byEmpire.set(f.empireId, list);
    }

    const empireIds = [...byEmpire.keys()];
    if (empireIds.length < 2) continue;

    for (let i = 0; i < empireIds.length; i++) {
      for (let j = i + 1; j < empireIds.length; j++) {
        const empA = state.empires.find(e => e.id === empireIds[i])!;
        const empB = state.empires.find(e => e.id === empireIds[j])!;
        const dipA = empA.diplomacy[empB.id] || 'neutral';
        const dipB = empB.diplomacy[empA.id] || 'neutral';

        if (dipA === 'war' || dipB === 'war' || dipA === 'hostile' || dipB === 'hostile' || empA.isPirate || empB.isPirate) {
          const fleetA = byEmpire.get(empireIds[i])![0];
          const fleetB = byEmpire.get(empireIds[j])![0];

          if (fleetA.ships.some(s => s.attack > 0) || fleetB.ships.some(s => s.attack > 0)) {
            const result = resolveCombat(state, systemId, fleetA, fleetB, rng);
            state.combatResults.push(result);
            applyCombatResult(state, result, fleetA, fleetB);
            state.events.push({
              turn: state.turn,
              type: 'combat',
              message: result.log[result.log.length - 1],
            });
          }
        }
      }
    }
  }
}