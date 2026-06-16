import { COLONIZATION_CREDITS_COST, COLONIZATION_FOOD_COST, INFLUENCE_COLONIZE_COST, PLANET_TYPE_INFO } from '../game/constants';
import { getColonizationProjectForPlanet } from '../game/colonization';
import { BUILDING_DEFINITIONS, getPlanetBuildingSlots } from '../game/buildings';
import { getPopulationGrowthPreview } from '../game/economy';
import { getShipProductionTurns } from '../game/production';
import { getAnomalyRewardPreview } from '../game/anomalies';
import { getStarColor } from '../game/galaxy';
import {
  canColonize, colonizePlanet,
  moveFleet, getFleetMovePreview, setFleetDestination,
  canBuildBuilding, buildBuilding, canQueueProduction, queueProduction,
  exploreAnomalyAction, setPlanetFocus,
  terraformPlanetAction, canTerraform,
  upgradeColonyAction, canUpgradeColonyDevelopment,
  clearBlockerAction, canClearBlocker,
  setSystemSpecialization, getCombatPrediction,
} from '../game/actions';
import { TERRAFORMING_TURNS } from '../game/constants';
import { getSystemDefenseRating } from '../game/combat';
import { isSystemUnderSiege } from '../game/siege';
import { canExploreAnomaly } from '../game/anomalies';
import { getShipDisplayName } from '../game/ships';
import { Icon } from './icons/Icon';
import { getPlanetIconName, getShipIconName, getStanceIconName } from './icons/iconHelpers';
import { SystemOrbitalView } from './SystemOrbitalView';
import { Tooltip } from './Tooltip';
import { cloneGameState } from '../game/clone';
import type { BuildingType, GameState, PlanetBlocker, PlanetFocus, ShipType, SystemSpecialization } from '../game/types';

interface Props {
  state: GameState;
  onUpdate: (state: GameState) => void;
  animationsEnabled?: boolean;
}

const SHIP_TYPES: ShipType[] = ['scout', 'frigate', 'cruiser', 'destroyer', 'carrier', 'dreadnought', 'colony'];
const FOCUS_OPTIONS: PlanetFocus[] = ['balanced', 'food', 'industry', 'science'];
const SPEC_OPTIONS: SystemSpecialization[] = ['science', 'industry', 'economy', 'military', 'frontier'];

export function SystemPanel({ state, onUpdate, animationsEnabled = true }: Props) {
  const system = state.systems.find(s => s.id === state.selectedSystemId);
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;

  if (!system) {
    return (
      <div className="panel-content">
        <p className="panel-empty">
          <Icon name="anomaly" size={32} style={{ marginBottom: 12, opacity: 0.5 }} /><br />
          Select a star system on the map.
        </p>
      </div>
    );
  }

  const isVisible = player.visibleSystems.has(system.id);
  const fleetsHere = state.fleets.filter(f => f.systemId === system.id);
  const ownsPlanet = system.planets.some(p => p.ownerId === player.id);
  const ownedPlanet = system.planets.find(p => p.ownerId === player.id && p.isColonized);
  const movePreview = state.selectedFleetId
    ? getFleetMovePreview(state, state.selectedFleetId, system.id)
    : null;
  const anomalyErr = canExploreAnomaly(state, system.id, player.id);

  const handleColonize = (planetId: string) => {
    const newState = cloneGameState(state);
    if (colonizePlanet(newState, planetId)) onUpdate(newState);
  };

  const handleMoveFleet = () => {
    const newState = cloneGameState(state);
    if (moveFleet(newState, state.selectedFleetId!, system.id)) {
      newState.selectedFleetId = null;
      onUpdate(newState);
    }
  };

  const handleBuildBuilding = (planetId: string, type: BuildingType) => {
    const newState = cloneGameState(state);
    if (buildBuilding(newState, planetId, type)) onUpdate(newState);
  };

  const handleQueue = (planetId: string, type: ShipType | BuildingType, kind: 'ship' | 'building') => {
    const newState = cloneGameState(state);
    if (queueProduction(newState, planetId, type, kind)) onUpdate(newState);
  };

  const handleExploreAnomaly = (choice: 'safe' | 'risky' | 'skip' = 'safe') => {
    const newState = cloneGameState(state);
    if (exploreAnomalyAction(newState, system.id, choice)) onUpdate(newState);
  };

  const owner = system.planets.find(p => p.ownerId)?.ownerId
    ? state.empires.find(e => e.id === system.planets.find(p => p.ownerId)?.ownerId)
    : null;

  return (
    <div className={`panel-content ${animationsEnabled ? 'panel-content--animated' : ''}`}>
      <SystemOrbitalView system={system} ownerColor={owner?.color} />
      <div className="section panel-section--stagger-0">
        <div className="section-title">
          <Icon name="anomaly" size={14} />
          {system.name}
        </div>
        <div className="info-row">
          <span>Star Class</span>
          <span style={{ color: getStarColor(system.starClass) }}>{system.starClass}-type</span>
        </div>
        <div className="info-row"><span>Richness</span><span>{(system.richness * 100).toFixed(0)}%</span></div>
        <div className="info-row">
          <span>Strategic Value</span>
          <span>{system.connections.length <= 2 ? 'Chokepoint' : system.richness >= 1.2 ? 'High' : 'Standard'}</span>
        </div>
        <div className="info-row"><span>Planets</span><span>{system.planets.length}</span></div>
        <div className="info-row"><span>Star Lanes</span><span>{system.connections.length}</span></div>
        {!isVisible && (
          <div className="info-row"><span>Intel</span><span style={{ color: 'var(--warning)' }}>Unexplored — send a fleet</span></div>
        )}
        <div className="info-row"><span>Fleets present</span><span>{fleetsHere.length}</span></div>
        {ownsPlanet && (
          <div className="info-row">
            <span>Defense Rating</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
              {getSystemDefenseRating(state, system, player.id)}
            </span>
          </div>
        )}
        {system.systemType === 'black_hole' && (
          <div className="info-row"><span>Type</span><span style={{ color: '#aa4aff' }}>Black Hole (+science, no colonization)</span></div>
        )}
        {system.orbitalStationOwnerId && (
          <div className="info-row">
            <span>Orbital Station</span>
            <span style={{ color: state.empires.find(e => e.id === system.orbitalStationOwnerId)?.color }}>
              {state.empires.find(e => e.id === system.orbitalStationOwnerId)?.name}
            </span>
          </div>
        )}
        {isSystemUnderSiege(system) && (
          <div className="info-row"><span>Siege</span><span style={{ color: '#ff4444' }}>Under blockade (-50% output)</span></div>
        )}
        {system.specialization && (
          <div className="info-row"><span>Specialization</span><span style={{ color: 'var(--accent-cyan)' }}>{system.specialization}</span></div>
        )}
        {ownsPlanet && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>System focus: </span>
            {SPEC_OPTIONS.map(spec => (
              <button
                key={spec}
                className={`btn btn-sm ${system.specialization === spec ? 'btn-primary' : ''}`}
                style={{ padding: '2px 6px', fontSize: '0.7rem', marginRight: 2 }}
                onClick={() => {
                  const newState = cloneGameState(state);
                  if (setSystemSpecialization(newState, system.id, spec)) onUpdate(newState);
                }}
              >
                {spec}
              </button>
            ))}
          </div>
        )}
      </div>

      {system.anomaly && isVisible && (
        <div className="section">
          <div className="section-title">
            <Icon name="anomaly" size={14} />
            Anomaly
          </div>
          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>{system.anomaly.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>{system.anomaly.description}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>
            Reward: {getAnomalyRewardPreview(system.anomaly.type)}
          </div>
          {system.anomaly.loreSnippet && (
            <div style={{ fontSize: '0.7rem', fontStyle: 'italic', color: 'var(--accent-blue)', marginBottom: 6 }}>
              {system.anomaly.loreSnippet}
            </div>
          )}
          {!system.exploredBy[player.id] ? (
            <div className="action-buttons" style={{ gap: 4 }}>
              <Tooltip content={anomalyErr || 'Safe exploration'}>
                <button className="btn btn-sm btn-primary btn-icon" disabled={!!anomalyErr} onClick={() => handleExploreAnomaly('safe')}>
                  <Icon name="anomaly" size={14} />
                  Safe
                </button>
              </Tooltip>
              <Tooltip content={anomalyErr || 'Risky — higher rewards, chance of failure'}>
                <button className="btn btn-sm btn-icon" disabled={!!anomalyErr} onClick={() => handleExploreAnomaly('risky')}>
                  Risky
                </button>
              </Tooltip>
            </div>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>Explored</span>
          )}
        </div>
      )}

      {isVisible && (
        <div className="section">
          <div className="section-title">Planets</div>
          {system.planets.map(planet => {
            const info = PLANET_TYPE_INFO[planet.type];
            const colonizeErr = canColonize(state, planet.id);
            const colonizationProject = getColonizationProjectForPlanet(state, planet.id);
            const isOwned = planet.ownerId === player.id;
            const growthPreview = isOwned ? getPopulationGrowthPreview(planet, player) : null;
            return (
              <div key={planet.id} className={`planet-card ${isOwned ? 'owned' : ''}`}>
                <Icon name={getPlanetIconName(planet.type)} size={36} className="planet-card__icon" />
                <div className="planet-card__body">
                  <div className="planet-name" style={{ color: info.color }}>{planet.name}</div>
                  <div className="planet-type">
                    {info.name} {planet.quality ? `(${planet.quality})` : ''}{' '}
                    {planet.isColonized ? `— ${state.empires.find(e => e.id === planet.ownerId)?.name || 'Unknown'}` : '— Unclaimed'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    Habitability: {Math.round(info.habitability * 100)}%
                    {isOwned && (() => {
                      const slots = getPlanetBuildingSlots(planet);
                      return ` · Improvements: ${slots.used}/${slots.max}`;
                    })()}
                  </div>
                  {(planet.blockers?.length ?? 0) > 0 && (
                    <div style={{ fontSize: '0.7rem', color: '#ff8844' }}>Blockers: {planet.blockers!.join(', ')}</div>
                  )}
                  {(planet.modifiers?.length ?? 0) > 0 && (
                    <div style={{ fontSize: '0.7rem', color: '#88ccff' }}>Modifiers: {planet.modifiers!.join(', ')}</div>
                  )}
                  {planet.luxuryResource && planet.luxuryResource !== 'none' && (
                    <div style={{ fontSize: '0.7rem', color: '#dda0ff' }}>Luxury: {planet.luxuryResource}</div>
                  )}
                  {planet.isColonized && (
                    <>
                          <div className="planet-stats">
                        <span>Pop: {planet.population}/{planet.maxPopulation}</span>
                        {growthPreview && (
                          <span style={{ color: growthPreview.blocked ? 'var(--warning)' : 'var(--accent-green)' }}>
                            {growthPreview.blocked
                              ? `Growth: blocked (${growthPreview.reason})`
                              : `Growth: +${growthPreview.growth} (${growthPreview.foodCost} food)`}
                          </span>
                        )}
                        <span className="stat-with-icon"><Icon name="food" size={12} /> {planet.foodOutput}</span>
                        <span className="stat-with-icon"><Icon name="industry" size={12} /> {planet.industryOutput}</span>
                        <span className="stat-with-icon"><Icon name="science" size={12} /> {planet.scienceOutput}</span>
                      </div>
                      {isOwned && (
                        <>
                          <div className="planet-stats" style={{ fontSize: '0.75rem' }}>
                            <Tooltip content="Happiness affects growth and output">
                              <span>Happiness: {planet.happiness}%</span>
                            </Tooltip>
                            <Tooltip content="Approval affects production efficiency">
                              <span>Approval: {planet.approval}%</span>
                            </Tooltip>
                          </div>
                          {planet.rareResource !== 'none' && (
                            <div style={{ fontSize: '0.75rem', color: '#ffaa4a' }}>
                              Rare: {planet.rareResource}
                            </div>
                          )}
                          {planet.isCapital && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>★ Capital (+10% output)</div>
                          )}
                          <div style={{ fontSize: '0.75rem' }}>Development: Lv.{planet.developmentLevel ?? 1}</div>
                          {(planet.terraformingProgress ?? 0) > 0 && (planet.terraformingProgress ?? 0) < TERRAFORMING_TURNS && (
                            <div className="terraform-progress">
                              <span style={{ fontSize: '0.7rem' }}>Terraforming {planet.terraformingProgress}/{TERRAFORMING_TURNS}</span>
                              <div className="progress-bar" style={{ height: 4, marginTop: 2 }}>
                                <div className="progress-fill" style={{ width: `${((planet.terraformingProgress ?? 0) / TERRAFORMING_TURNS) * 100}%` }} />
                              </div>
                            </div>
                          )}
                          {(planet.blockers?.length ?? 0) > 0 && (
                            <div className="action-buttons" style={{ marginTop: 4, gap: 4 }}>
                              {planet.blockers!.map((blocker: PlanetBlocker) => (
                                <Tooltip key={blocker} content={canClearBlocker(state, planet.id, blocker) || `Clear ${blocker}`}>
                                  <button
                                    className="btn btn-sm"
                                    disabled={!!canClearBlocker(state, planet.id, blocker)}
                                    onClick={() => {
                                      const newState = cloneGameState(state);
                                      if (clearBlockerAction(newState, planet.id, blocker)) onUpdate(newState);
                                    }}
                                  >
                                    Clear {blocker}
                                  </button>
                                </Tooltip>
                              ))}
                            </div>
                          )}
                          <div className="action-buttons" style={{ marginTop: 4, gap: 4 }}>
                            <Tooltip content={canTerraform(state, planet.id) || 'Terraform (requires tech + industry)'}>
                              <button className="btn btn-sm" disabled={!!canTerraform(state, planet.id)} onClick={() => {
                                const newState = cloneGameState(state);
                                if (terraformPlanetAction(newState, planet.id)) onUpdate(newState);
                              }}>Terraform</button>
                            </Tooltip>
                            <Tooltip content={canUpgradeColonyDevelopment(state, planet.id) || 'Upgrade colony development'}>
                              <button className="btn btn-sm" disabled={!!canUpgradeColonyDevelopment(state, planet.id)} onClick={() => {
                                const newState = cloneGameState(state);
                                if (upgradeColonyAction(newState, planet.id)) onUpdate(newState);
                              }}>Upgrade</button>
                            </Tooltip>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Focus: </span>
                            {FOCUS_OPTIONS.map(f => (
                              <button
                                key={f}
                                className={`btn btn-sm ${planet.focus === f ? 'btn-primary' : ''}`}
                                style={{ padding: '2px 6px', fontSize: '0.7rem', marginRight: 2 }}
                                onClick={() => {
                                  const newState = cloneGameState(state);
                                  if (setPlanetFocus(newState, planet.id, f)) onUpdate(newState);
                                }}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                          {planet.buildings.length > 0 && (
                            <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                              Buildings: {planet.buildings.join(', ')}
                            </div>
                          )}
                          {planet.productionQueue.length > 0 && (
                            <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--accent-blue)' }}>
                              Queue: {planet.productionQueue.map(q => `${q.type} (${q.turnsRemaining}t)`).join(', ')}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                  {colonizationProject && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>
                        Colonization in progress: {colonizationProject.turnsRemaining}/{colonizationProject.totalTurns} turns
                      </div>
                      <div className="progress-bar" style={{ height: 4, marginTop: 4 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${((colonizationProject.totalTurns - colonizationProject.turnsRemaining) / colonizationProject.totalTurns) * 100}%`,
                            background: 'var(--accent-green)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {!planet.isColonized && !colonizationProject && info.habitability > 0 && (
                    <>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
                        Requires: colony ship in system OR {COLONIZATION_CREDITS_COST} credits + {COLONIZATION_FOOD_COST} food via connected lane · {INFLUENCE_COLONIZE_COST} influence (2–3 turns)
                      </div>
                      <Tooltip content={colonizeErr || 'Begin colonization project (consumes colony ship if present)'}>
                        <button
                          className="btn btn-sm btn-primary btn-icon"
                          style={{ marginTop: 6 }}
                          disabled={!!colonizeErr}
                          onClick={() => handleColonize(planet.id)}
                        >
                          <Icon name="colony" size={14} />
                          Colonize
                        </button>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ownedPlanet && (
        <div className="section">
          <div className="section-title">Buildings — {ownedPlanet.name}</div>
          <div className="action-buttons" style={{ flexWrap: 'wrap', gap: 4 }}>
            {BUILDING_DEFINITIONS.map(def => {
              const err = canBuildBuilding(state, ownedPlanet.id, def.type);
              return (
                <Tooltip key={def.type} content={err || def.description}>
                  <button
                    className="btn btn-sm"
                    disabled={!!err}
                    onClick={() => handleBuildBuilding(ownedPlanet.id, def.type)}
                  >
                    {def.name}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {ownedPlanet?.buildings.includes('spaceport') ? (
        <div className="section">
          <div className="section-title">
            <Icon name="fleet" size={14} />
            Shipyard — {ownedPlanet.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>
            Ships are built through the production queue ({ownedPlanet.productionQueue.length}/3 slots used). Each ship takes turns to complete.
          </div>
          <div className="action-buttons" style={{ flexWrap: 'wrap', gap: 4 }}>
            {SHIP_TYPES.map(type => {
              const err = canQueueProduction(state, ownedPlanet.id, type, 'ship');
              const turns = getShipProductionTurns(type, player);
              return (
                <Tooltip key={type} content={err || `Queue ${getShipDisplayName(type)} (${turns} turn${turns > 1 ? 's' : ''})`}>
                  <button className="btn btn-sm btn-icon" disabled={!!err} onClick={() => handleQueue(ownedPlanet.id, type, 'ship')}>
                    <Icon name={getShipIconName(type)} size={14} />
                    {getShipDisplayName(type)} ({turns}t)
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ) : ownsPlanet && (
        <div className="section">
          <div className="section-title">Ship Construction</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Build a Spaceport to queue ships. Research Orbital Construction, then construct a Spaceport from the Buildings section.
          </p>
        </div>
      )}

      {state.selectedFleetId && movePreview && (
        <div className="section">
          <div className="section-title">Fleet Movement</div>
          {movePreview.path.length > 1 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>
              Route: {movePreview.path.map(id => state.systems.find(s => s.id === id)?.name).join(' → ')}
            </div>
          )}
          {movePreview.canMove && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>
              Distance: {movePreview.distance} — {movePreview.turnsRequired} turn(s)
            </div>
          )}
          {(() => {
            const prediction = getCombatPrediction(state, state.selectedFleetId!, system.id);
            if (!prediction) return null;
            return (
              <div className="combat-prediction" style={{ fontSize: '0.75rem', marginBottom: 6, padding: 6, background: 'var(--bg-dark)', borderRadius: 4 }}>
                <strong>Combat forecast:</strong> {Math.round(prediction.attackerWinChance * 100)}% win chance
                · ~{prediction.estimatedRounds} rounds
                · ATK {prediction.attackerPower} vs DEF {prediction.defenderPower}
              </div>
            );
          })()}
          <div className="action-buttons" style={{ gap: 4 }}>
            <Tooltip content={movePreview.error || 'Move fleet one hop to this system'}>
              <button
                className="btn btn-sm btn-primary btn-icon"
                disabled={!movePreview.canMove}
                onClick={handleMoveFleet}
              >
                <Icon name="fleet" size={14} />
                Move Here
              </button>
            </Tooltip>
            {movePreview.turnsRequired > 1 && (
              <Tooltip content="Set multi-hop destination route">
                <button
                  className="btn btn-sm btn-icon"
                  onClick={() => {
                    const newState = cloneGameState(state);
                    if (setFleetDestination(newState, state.selectedFleetId!, system.id)) onUpdate(newState);
                  }}
                >
                  <Icon name="fleet" size={14} />
                  Set Destination
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {fleetsHere.length > 0 && (
        <div className="section">
          <div className="section-title">Fleets in System</div>
          {fleetsHere.map(fleet => {
            const empire = state.empires.find(e => e.id === fleet.empireId)!;
            return (
              <div
                key={fleet.id}
                className={`fleet-item ${state.selectedFleetId === fleet.id ? 'selected' : ''}`}
                onClick={() => fleet.empireId === player.id && onUpdate({ ...state, selectedFleetId: fleet.id })}
              >
                <Icon name="fleet" size={28} style={{ filter: `drop-shadow(0 0 6px ${empire.color})` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: empire.color, fontWeight: 600 }}>{empire.name}</div>
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
                    {fleet.destinationSystemId && ` → ${state.systems.find(s => s.id === fleet.destinationSystemId)?.name ?? '?'}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}