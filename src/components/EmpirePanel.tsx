import {
  getPlayerFleets, getPlayerMilitaryPower, getMergeableFleets,
  setFleetDestination, setFleetStance, setFleetAutoExplore,
  mergeFleets, splitFleet, canSplitFleet,
} from '../game/actions';
import { computeEmpireLedger } from '../game/economyLedger';
import { getFleetRole, getFleetRoleLabel, getPrimaryShipType } from '../game/fleetRoles';
import { calculateFleetUpkeep } from '../game/upkeep';
import { getTraitName } from '../game/traits';
import { getEmpireRankings } from '../game/scoring';
import { getVictoryProgress } from '../game/victory';
import { getShipDisplayName } from '../game/ships';
import { Icon, getEmblemIconName, getShipIconName, getStanceIconName } from './icons/Icon';
import { ResourceBar } from './ResourceBar';
import { BattleReportPanel } from './BattleReportPanel';
import { ProductionOverview } from './ProductionOverview';
import { Tooltip } from './Tooltip';
import { cloneGameState } from '../game/clone';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onUpdate: (state: GameState) => void;
}

export function EmpirePanel({ state, onUpdate }: Props) {
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const fleets = getPlayerFleets(state);
  const militaryPower = getPlayerMilitaryPower(state, player.id);
  const rankings = getEmpireRankings(state);
  const victoryProgress = getVictoryProgress(state);
  const playerRank = rankings.find(r => r.empire.id === player.id);
  const ledger = computeEmpireLedger(state, player);

  const totalBuildings = state.systems
    .flatMap(s => s.planets)
    .filter(p => p.ownerId === player.id)
    .reduce((sum, p) => sum + p.buildings.length, 0);

  const queueCount = state.systems
    .flatMap(s => s.planets)
    .filter(p => p.ownerId === player.id)
    .reduce((sum, p) => sum + p.productionQueue.length, 0);

  const selectedFleet = state.selectedFleetId
    ? state.fleets.find(f => f.id === state.selectedFleetId)
    : null;
  const mergeable = selectedFleet ? getMergeableFleets(state, selectedFleet.id) : [];

  const handleMerge = (otherId: string) => {
    const newState = cloneGameState(state);
    if (mergeFleets(newState, selectedFleet!.id, otherId)) onUpdate(newState);
  };

  const handleSplit = () => {
    if (!selectedFleet) return;
    const count = Math.floor(selectedFleet.ships.length / 2);
    const newState = cloneGameState(state);
    if (splitFleet(newState, selectedFleet.id, count)) onUpdate(newState);
  };

  const handleSetDestination = (systemId: string) => {
    const newState = cloneGameState(state);
    if (setFleetDestination(newState, selectedFleet!.id, systemId)) onUpdate(newState);
  };

  const handleClearDestination = () => {
    const newState = cloneGameState(state);
    if (setFleetDestination(newState, selectedFleet!.id, null)) onUpdate(newState);
  };

  return (
    <div className="panel-content">
      <div className="section">
        <div className="section-title">
          <Icon name={getEmblemIconName(player.emblem)} size={16} />
          {player.name}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 8 }}>
          Trait: {getTraitName(player.trait)} | Score: {player.score} (#{playerRank?.rank ?? '?'})
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__value">{player.totalPlanets}</div>
            <div className="stat-card__label">Planets</div>
          </div>
          <Tooltip content="Used for colonization and buildings">
            <div className="stat-card">
              <div className="stat-card__value">{player.influence}</div>
              <div className="stat-card__label">Influence</div>
            </div>
          </Tooltip>
          <div className="stat-card">
            <div className="stat-card__value">{militaryPower}</div>
            <div className="stat-card__label">Military</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{player.researchedTechs.length}</div>
            <div className="stat-card__label">Technologies</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{totalBuildings}</div>
            <div className="stat-card__label">Buildings</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{queueCount}</div>
            <div className="stat-card__label">Queue</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{fleets.length}</div>
            <div className="stat-card__label">Fleets</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{player.warWeariness}</div>
            <div className="stat-card__label">Weariness</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Strategic Resources</div>
        <div className="strategic-resources">
          <span className="strategic-resource"><Icon name="titanium" size={14} /> {player.strategicResources.titanium}</span>
          <span className="strategic-resource"><Icon name="antimatter" size={14} /> {player.strategicResources.antimatter}</span>
          <span className="strategic-resource"><Icon name="darkmatter" size={14} /> {player.strategicResources.darkmatter}</span>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Economy Ledger</div>
        <div className="economy-ledger" style={{ fontSize: '0.75rem' }}>
          <div className="info-row"><span>Planet income</span><span>+{ledger.planets.credits} cr · +{ledger.planets.food} food · +{ledger.planets.industry} ind · +{ledger.planets.science} sci</span></div>
          <div className="info-row"><span>Trade</span><span>+{ledger.trade.credits} cr</span></div>
          <div className="info-row"><span>Upkeep</span><span>-{ledger.upkeep.fleet} fleet · -{ledger.upkeep.buildings} buildings</span></div>
          <div className="info-row" style={{ fontWeight: 600 }}><span>Net / turn</span><span>+{ledger.net.credits} cr · +{ledger.net.food} food · +{ledger.net.industry} ind · +{ledger.net.science} sci</span></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Resources</div>
        <ResourceBar resources={player.resources} strategicResources={player.strategicResources} compact />
      </div>

      {state.turnSummaries.length > 0 && state.turnSummaries[state.turnSummaries.length - 1].economy && (
        <div className="section">
          <div className="section-title">Income / Expenses (last turn)</div>
          {(() => {
            const eco = state.turnSummaries[state.turnSummaries.length - 1].economy!;
            const maxVal = Math.max(
              eco.income.credits, eco.income.food, eco.income.industry, eco.income.science,
              eco.expenses.credits, eco.expenses.fleetUpkeep, eco.expenses.maintenance, 1
            );
            const rows = [
              { label: 'Credits +', value: eco.income.credits, color: 'var(--accent-gold)' },
              { label: 'Food +', value: eco.income.food, color: 'var(--accent-green)' },
              { label: 'Industry +', value: eco.income.industry, color: 'var(--accent-orange)' },
              { label: 'Science +', value: eco.income.science, color: 'var(--accent-blue)' },
              { label: 'Fleet upkeep -', value: eco.expenses.fleetUpkeep, color: 'var(--accent-red)' },
              { label: 'Maintenance -', value: eco.expenses.maintenance, color: 'var(--accent-red)' },
            ];
            return (
              <div className="economy-breakdown">
                {rows.map(row => (
                  <div key={row.label} className="economy-breakdown-row">
                    <span className="economy-breakdown-label">{row.label}</span>
                    <div className="economy-breakdown-track">
                      <div className="economy-breakdown-fill" style={{ width: `${(row.value / maxVal) * 100}%`, background: row.color }} />
                    </div>
                    <span className="economy-breakdown-value">{row.value}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      <div className="section">
        <div className="section-title">Empire Rankings</div>
        <div className="leaderboard">
          {rankings.map(({ empire, score, rank }) => (
            <div
              key={empire.id}
              className={`leaderboard-card ${empire.id === player.id ? 'leaderboard-card--player' : ''}`}
            >
              <span className="leaderboard-card__rank">#{rank}</span>
              <Icon name={getEmblemIconName(empire.emblem)} size={20} />
              <span className="leaderboard-card__name" style={{ color: empire.color }}>{empire.name}</span>
              <span className="leaderboard-card__score">{score}</span>
            </div>
          ))}
        </div>
      </div>

      <ProductionOverview state={state} />

      <div className="section">
        <div className="section-title">
          <Icon name="fleet" size={14} />
          Fleets ({fleets.length})
        </div>
        {fleets.map(fleet => {
          const system = state.systems.find(s => s.id === fleet.systemId)!;
          const upkeep = calculateFleetUpkeep([fleet]);
          const role = getFleetRole(fleet);
          const roleLabel = getFleetRoleLabel(role);
          const primaryType = getPrimaryShipType(fleet);
          return (
            <div
              key={fleet.id}
              className={`fleet-item ${state.selectedFleetId === fleet.id ? 'selected' : ''}`}
              onClick={() => onUpdate({ ...state, selectedFleetId: fleet.id, selectedSystemId: fleet.systemId })}
            >
              <Icon name="fleet" size={24} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {system.name}
                  <span className="fleet-role-badge" style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                    {roleLabel}
                  </span>
                  {fleet.isVeteran && <span className="veteran-badge" title="Veteran fleet"> ★Vet</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  Primary: {getShipDisplayName(primaryType)}
                </div>
                <div className="fleet-item__ships">
                  {fleet.ships.map((s, i) => (
                    <span key={i} className="fleet-ship-badge">
                      <Icon name={getShipIconName(s.type)} size={12} />
                      {getShipDisplayName(s.type)}
                    </span>
                  ))}
                </div>
                <div className="fleet-item__meta">
                  <Icon name={getStanceIconName(fleet.stance)} size={12} title={fleet.stance} />
                  Moves: {fleet.movesRemaining}
                  {fleet.autoExplore && ' | Auto-explore'}
                  {fleet.destinationSystemId && ` → ${state.systems.find(s => s.id === fleet.destinationSystemId)?.name}`}
                  {' · '}Upkeep: {upkeep} cr/turn
                </div>
              </div>
            </div>
          );
        })}

        {selectedFleet && (
          <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-dark)', borderRadius: 4 }}>
            <div className="section-title" style={{ fontSize: '0.85rem' }}>Fleet Controls</div>
            <div className="action-buttons" style={{ flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              <button className={`btn btn-sm ${selectedFleet.stance === 'passive' ? 'btn-primary' : ''}`}
                onClick={() => { const s = cloneGameState(state); setFleetStance(s, selectedFleet.id, 'passive'); onUpdate(s); }}>
                Passive
              </button>
              <button className={`btn btn-sm ${selectedFleet.stance === 'aggressive' ? 'btn-primary' : ''}`}
                onClick={() => { const s = cloneGameState(state); setFleetStance(s, selectedFleet.id, 'aggressive'); onUpdate(s); }}>
                Aggressive
              </button>
              <button className={`btn btn-sm ${selectedFleet.autoExplore ? 'btn-primary' : ''}`}
                onClick={() => { const s = cloneGameState(state); setFleetAutoExplore(s, selectedFleet.id, !selectedFleet.autoExplore); onUpdate(s); }}>
                Auto-Explore
              </button>
              {selectedFleet.ships.length > 1 && (
                <Tooltip content={canSplitFleet(state, selectedFleet.id, Math.floor(selectedFleet.ships.length / 2)) || 'Split fleet in half'}>
                  <button
                    className="btn btn-sm"
                    disabled={!!canSplitFleet(state, selectedFleet.id, Math.floor(selectedFleet.ships.length / 2))}
                    onClick={handleSplit}
                  >
                    Split
                  </button>
                </Tooltip>
              )}
              {selectedFleet.destinationSystemId && (
                <button className="btn btn-sm" onClick={handleClearDestination}>Clear Route</button>
              )}
            </div>
            {mergeable.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Merge with: </span>
                {mergeable.map(f => (
                  <button key={f.id} className="btn btn-sm" onClick={() => handleMerge(f.id)}>Fleet ({f.ships.length} ships)</button>
                ))}
              </div>
            )}
            {state.selectedSystemId && state.selectedSystemId !== selectedFleet.systemId && (
              <button className="btn btn-sm btn-primary" onClick={() => handleSetDestination(state.selectedSystemId!)}>
                Set Destination → {state.systems.find(s => s.id === state.selectedSystemId)?.name}
              </button>
            )}
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 6 }}>
              Click adjacent system to move, or select distant system and Set Destination for multi-hop route.
            </p>
          </div>
        )}
      </div>

      <BattleReportPanel state={state} />

      <div className="section">
        <div className="section-title">Victory Progress</div>
        {(['domination', 'science', 'influence', 'survival'] as const).map(type => (
          <div key={type} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              <span>{Math.round(victoryProgress[type] * 100)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-dark)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${victoryProgress[type] * 100}%`, background: 'var(--accent-blue)', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}