import { RESEARCH_PACT_SCIENCE_BONUS, TRADE_PACT_CREDITS_PER_TURN } from './constants';
import { getAdjacentSystems } from './galaxy';
import type { DiplomacyState, Empire, GameState } from './types';

export const RELATION_MIN = 0;
export const RELATION_MAX = 100;
export const RELATION_NEUTRAL = 50;
export const MUTUAL_DEFENSE_THRESHOLD = 60;
export const BORDER_TENSION_PENALTY = 3;
export const TRIBUTE_AMOUNT = 25;
export const WAR_SCORE_CAPTURE = 10;
export const WAR_SCORE_BATTLE_WIN = 5;

export function getRelationScore(empire: Empire, otherId: string): number {
  return empire.relationScores?.[otherId] ?? RELATION_NEUTRAL;
}

export function setRelationScore(empireA: Empire, empireB: Empire, delta: number): void {
  empireA.relationScores = empireA.relationScores ?? {};
  empireB.relationScores = empireB.relationScores ?? {};
  const newA = Math.max(RELATION_MIN, Math.min(RELATION_MAX, getRelationScore(empireA, empireB.id) + delta));
  const newB = Math.max(RELATION_MIN, Math.min(RELATION_MAX, getRelationScore(empireB, empireA.id) + delta));
  empireA.relationScores[empireB.id] = newA;
  empireB.relationScores[empireA.id] = newB;
}

export function initRelationScores(state: GameState): void {
  for (let i = 0; i < state.empires.length; i++) {
    for (let j = i + 1; j < state.empires.length; j++) {
      const a = state.empires[i];
      const b = state.empires[j];
      a.relationScores = a.relationScores ?? {};
      b.relationScores = b.relationScores ?? {};
      if (a.relationScores[b.id] === undefined) a.relationScores[b.id] = RELATION_NEUTRAL;
      if (b.relationScores[a.id] === undefined) b.relationScores[a.id] = RELATION_NEUTRAL;
    }
  }
}

export function getDiplomacy(empire: Empire, otherId: string): DiplomacyState {
  return empire.diplomacy[otherId] || 'neutral';
}

export function setDiplomacy(empireA: Empire, empireB: Empire, dipState: DiplomacyState): void {
  empireA.diplomacy[empireB.id] = dipState;
  empireB.diplomacy[empireA.id] = dipState;
  if (dipState === 'trade' || dipState === 'pact' || dipState === 'research_pact') {
    setRelationScore(empireA, empireB, 10);
  } else if (dipState === 'hostile') {
    setRelationScore(empireA, empireB, -15);
  } else if (dipState === 'war') {
    setRelationScore(empireA, empireB, -25);
  } else if (dipState === 'neutral') {
    const score = getRelationScore(empireA, empireB.id);
    if (score < RELATION_NEUTRAL) setRelationScore(empireA, empireB, 5);
  }
}

export function declareWar(empireA: Empire, empireB: Empire): void {
  if (getDiplomacy(empireA, empireB.id) === 'pact') return;
  setDiplomacy(empireA, empireB, 'war');
  empireA.warScores = empireA.warScores ?? {};
  empireB.warScores = empireB.warScores ?? {};
  empireA.warScores[empireB.id] = 0;
  empireB.warScores[empireA.id] = 0;
}

export function makeHostile(empireA: Empire, empireB: Empire): void {
  if (getDiplomacy(empireA, empireB.id) === 'neutral') {
    setDiplomacy(empireA, empireB, 'hostile');
  }
}

export function makePeace(empireA: Empire, empireB: Empire): void {
  setDiplomacy(empireA, empireB, 'neutral');
  if (empireA.warScores) delete empireA.warScores[empireB.id];
  if (empireB.warScores) delete empireB.warScores[empireA.id];
}

export function proposeTradePact(empireA: Empire, empireB: Empire): boolean {
  const current = getDiplomacy(empireA, empireB.id);
  if (current === 'war' || current === 'hostile') return false;
  setDiplomacy(empireA, empireB, 'trade');
  return true;
}

export function proposeNonAggressionPact(empireA: Empire, empireB: Empire): boolean {
  const current = getDiplomacy(empireA, empireB.id);
  if (current === 'war' || current === 'hostile') return false;
  setDiplomacy(empireA, empireB, 'pact');
  return true;
}

export function proposeResearchPact(empireA: Empire, empireB: Empire): boolean {
  const current = getDiplomacy(empireA, empireB.id);
  if (current === 'war' || current === 'hostile') return false;
  setDiplomacy(empireA, empireB, 'research_pact');
  return true;
}

export function canDeclareWar(empireA: Empire, empireB: Empire): boolean {
  return getDiplomacy(empireA, empireB.id) !== 'pact';
}

export function areAtWar(empireA: Empire, empireB: Empire): boolean {
  const dip = getDiplomacy(empireA, empireB.id);
  return dip === 'war' || dip === 'hostile';
}

export function demandPeace(empireA: Empire, empireB: Empire): boolean {
  if (getDiplomacy(empireA, empireB.id) !== 'war') return false;
  const scoreA = empireA.warScores?.[empireB.id] ?? 0;
  const scoreB = empireB.warScores?.[empireA.id] ?? 0;
  if (scoreA > scoreB + 15 || scoreB > scoreA + 15) {
    makePeace(empireA, empireB);
    return true;
  }
  return false;
}

export function demandTribute(payer: Empire, receiver: Empire): boolean {
  if (getDiplomacy(payer, receiver.id) !== 'war') return false;
  const score = receiver.warScores?.[payer.id] ?? 0;
  if (score < 20) return false;
  if (payer.resources.credits < TRIBUTE_AMOUNT) return false;
  payer.resources.credits -= TRIBUTE_AMOUNT;
  receiver.resources.credits += TRIBUTE_AMOUNT;
  makePeace(payer, receiver);
  setRelationScore(payer, receiver, -10);
  return true;
}

export function getWarScore(empire: Empire, otherId: string): number {
  return empire.warScores?.[otherId] ?? 0;
}

export function addWarScore(empire: Empire, otherId: string, amount: number): void {
  empire.warScores = empire.warScores ?? {};
  empire.warScores[otherId] = (empire.warScores[otherId] ?? 0) + amount;
}

export function processTradePacts(state: GameState): void {
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    for (const [otherId, dipState] of Object.entries(empire.diplomacy)) {
      if (dipState === 'trade') {
        const other = state.empires.find(e => e.id === otherId);
        if (other?.isAlive) {
          empire.resources.credits += TRADE_PACT_CREDITS_PER_TURN;
        }
      }
    }
  }
}

export function processResearchPacts(state: GameState): void {
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    for (const [otherId, dipState] of Object.entries(empire.diplomacy)) {
      if (dipState === 'research_pact') {
        const other = state.empires.find(e => e.id === otherId);
        if (other?.isAlive) {
          empire.resources.science += RESEARCH_PACT_SCIENCE_BONUS;
        }
      }
    }
  }
}

function isBorderSystem(state: GameState, systemId: string, empireAId: string, empireBId: string): boolean {
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return false;
  const aOwns = system.planets.some(p => p.ownerId === empireAId);
  const bOwns = system.planets.some(p => p.ownerId === empireBId);
  if (!aOwns && !bOwns) return false;
  const neighbors = getAdjacentSystems(state.systems, systemId);
  return neighbors.some(n =>
    n.planets.some(p => p.ownerId === empireAId) ||
    n.planets.some(p => p.ownerId === empireBId)
  );
}

export function processBorderTension(state: GameState): void {
  for (const empire of state.empires) {
    if (!empire.isAlive || empire.isPirate) continue;
    for (const other of state.empires) {
      if (other.id === empire.id || !other.isAlive || other.isPirate) continue;
      const dip = getDiplomacy(empire, other.id);
      if (dip === 'war' || dip === 'pact' || dip === 'trade') continue;

      const warFleetsNearBorder = state.fleets.some(f => {
        if (f.empireId !== empire.id) return false;
        if (!f.ships.some(s => s.attack > 0)) return false;
        const neighbors = getAdjacentSystems(state.systems, f.systemId);
        return neighbors.some(n => {
          const enemyFleet = state.fleets.some(ef =>
            ef.systemId === n.id && ef.empireId === other.id && ef.ships.some(s => s.attack > 0)
          );
          const enemyPlanet = n.planets.some(p => p.ownerId === other.id);
          return enemyFleet || (enemyPlanet && isBorderSystem(state, f.systemId, empire.id, other.id));
        });
      });

      if (warFleetsNearBorder) {
        setRelationScore(empire, other, -BORDER_TENSION_PENALTY);
        if (empire.isPlayer || other.isPlayer) {
          state.events.push({
            turn: state.turn,
            type: 'diplomacy',
            message: `Border tension: ${empire.name} and ${other.name} — fleets near shared border (-${BORDER_TENSION_PENALTY} relation)`,
          });
        }
      }
    }
  }
}

export function processMutualDefense(state: GameState): void {
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    for (const other of state.empires) {
      if (other.id === empire.id || !other.isAlive) continue;
      const dip = getDiplomacy(empire, other.id);
      const relation = getRelationScore(empire, other.id);
      if (dip !== 'pact' || relation < MUTUAL_DEFENSE_THRESHOLD) continue;

      const allyUnderAttack = state.fleets.some(f => {
        if (f.empireId !== other.id) return false;
        const attackers = state.fleets.filter(af =>
          af.systemId === f.systemId &&
          af.empireId !== other.id &&
          af.ships.some(s => s.attack > 0)
        );
        return attackers.some(af => areAtWar(other, state.empires.find(e => e.id === af.empireId)!));
      });

      if (allyUnderAttack && !empire.isPlayer) {
        const attacker = state.fleets.find(f =>
          f.systemId && state.fleets.some(af => af.systemId === f.systemId && af.empireId === other.id)
        );
        if (attacker) {
          const attackerEmpire = state.empires.find(e => e.id === attacker.empireId);
          if (attackerEmpire && getDiplomacy(empire, attackerEmpire.id) !== 'war') {
            declareWar(empire, attackerEmpire);
            state.events.push({
              turn: state.turn,
              type: 'diplomacy',
              message: `${empire.name} honors mutual defense pact with ${other.name}!`,
            });
          }
        }
      }
    }
  }
}

export function getBorderFrictionScore(state: GameState, empireA: Empire, empireB: Empire): number {
  let score = 0;

  for (const system of state.systems) {
    const aOwns = system.planets.some(p => p.ownerId === empireA.id);
    const bOwns = system.planets.some(p => p.ownerId === empireB.id);
    if (aOwns && bOwns) score += 20;

    const neighbors = getAdjacentSystems(state.systems, system.id);
    for (const neighbor of neighbors) {
      const aNeighbor = neighbor.planets.some(p => p.ownerId === empireA.id);
      const bNeighbor = neighbor.planets.some(p => p.ownerId === empireB.id);
      if ((aOwns && bNeighbor) || (bOwns && aNeighbor)) score += 12;
    }
  }

  const dip = getDiplomacy(empireA, empireB.id);
  if (dip === 'hostile') score += 15;
  if (dip === 'war') score += 25;

  const relation = getRelationScore(empireA, empireB.id);
  if (relation < 40) score += Math.floor((40 - relation) / 2);

  const fleetTension = state.fleets.some(f => {
    if (f.empireId !== empireA.id || !f.ships.some(s => s.attack > 0)) return false;
    const neighbors = getAdjacentSystems(state.systems, f.systemId);
    return neighbors.some(n =>
      n.planets.some(p => p.ownerId === empireB.id) ||
      state.fleets.some(ef =>
        ef.systemId === n.id && ef.empireId === empireB.id && ef.ships.some(s => s.attack > 0)
      )
    );
  });
  if (fleetTension) score += 10;

  return Math.min(100, score);
}

export function getTradePartners(state: GameState, empireId: string): string[] {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return [];
  return Object.entries(empire.diplomacy)
    .filter(([, dip]) => dip === 'trade')
    .map(([id]) => id);
}