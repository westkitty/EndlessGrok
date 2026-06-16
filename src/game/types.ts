import type { PLANET_TYPE_INFO } from './constants';

export type PlanetType = keyof typeof PLANET_TYPE_INFO;
export type DiplomacyState = 'neutral' | 'hostile' | 'war' | 'trade' | 'pact' | 'research_pact';
export type ShipType = 'scout' | 'frigate' | 'cruiser' | 'destroyer' | 'carrier' | 'colony' | 'dreadnought';
export type GamePhase = 'menu' | 'playing' | 'victory' | 'defeat';
export type VictoryType = 'domination' | 'science' | 'survival' | 'influence' | 'economy' | null;
export type DiplomaticProposalType = 'trade' | 'pact' | 'research_pact' | 'peace';
export type StarSpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
export type SystemType = 'normal' | 'black_hole';
export type AnomalyType =
  | 'derelict'
  | 'nebula'
  | 'asteroid_field'
  | 'ancient_ruins'
  | 'wormhole'
  | 'resource_cache'
  | 'dark_matter_cloud'
  | 'signal_beacon'
  | 'precursor';
export type BuildingType =
  | 'farm'
  | 'factory'
  | 'lab'
  | 'spaceport'
  | 'defense_grid'
  | 'hospital'
  | 'mining_complex'
  | 'market'
  | 'academy'
  | 'fortress'
  | 'orbital_station';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type GalaxySizeOption = 'small' | 'medium' | 'large' | 'huge';
export type GalaxyShape = 'spiral' | 'cluster' | 'ring' | 'elliptical' | 'sparse';
export type EmpireTrait = 'expansionist' | 'scientific' | 'militarist';
export type RareResource = 'none' | 'titanium' | 'antimatter' | 'darkmatter';
export type PlanetFocus = 'balanced' | 'food' | 'industry' | 'science';
export type FleetStance = 'passive' | 'aggressive';
export type EmblemId = 'terran' | 'crimson' | 'verdant' | 'solar' | 'void';
export type PlanetQualityTier = 'poor' | 'average' | 'rich' | 'exceptional';
export type PlanetBlocker = 'radiation' | 'tectonic' | 'toxic_atmosphere';
export type PlanetModifier = 'mineral_rich' | 'fertile' | 'unstable' | 'ancient_cities';
export type LuxuryResource = 'crystals' | 'spices';
export type SystemSpecialization = 'science' | 'industry' | 'economy' | 'military' | 'frontier';
export type WeaponType = 'kinetic' | 'beam' | 'missile';
export type DefenseType = 'armor' | 'shields' | 'evasion';
export type AIPersonality = 'aggressive' | 'diplomatic' | 'isolationist';
export type AIGoal = 'expand' | 'research' | 'militarize';
export type AnomalyExploreChoice = 'safe' | 'risky' | 'skip';
export type TechBranch = 'military' | 'economy' | 'exploration' | 'science';

export interface Resources {
  credits: number;
  food: number;
  industry: number;
  science: number;
}

export interface StrategicResources {
  titanium: number;
  antimatter: number;
  darkmatter: number;
}

export interface Ship {
  type: ShipType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  weaponType?: WeaponType;
  defenseType?: DefenseType;
}

export interface Fleet {
  id: string;
  empireId: string;
  systemId: string;
  ships: Ship[];
  movesRemaining: number;
  hasColonyShip: boolean;
  destinationSystemId: string | null;
  travelPath: string[];
  travelTurns: number;
  stance: FleetStance;
  autoExplore: boolean;
  battleCount?: number;
  isVeteran?: boolean;
}

export interface ProductionItem {
  id: string;
  type: ShipType | BuildingType;
  kind: 'ship' | 'building';
  turnsRemaining: number;
  totalTurns: number;
  systemId: string;
  planetId?: string;
}

export interface Planet {
  id: string;
  name: string;
  type: PlanetType;
  systemId: string;
  ownerId: string | null;
  population: number;
  maxPopulation: number;
  foodOutput: number;
  industryOutput: number;
  scienceOutput: number;
  minerals: number;
  energy: number;
  isColonized: boolean;
  happiness: number;
  approval: number;
  buildings: BuildingType[];
  productionQueue: ProductionItem[];
  rareResource: RareResource;
  focus: PlanetFocus;
  isCapital: boolean;
  quality?: PlanetQualityTier;
  blockers?: PlanetBlocker[];
  modifiers?: PlanetModifier[];
  luxuryResource?: LuxuryResource | 'none';
  developmentLevel?: number;
  terraformingProgress?: number;
}

export interface SystemAnomaly {
  id: string;
  type: AnomalyType;
  name: string;
  description: string;
  explored: boolean;
  rewardClaimed: boolean;
  loreSnippet?: string;
}

export interface StarSystem {
  id: string;
  name: string;
  x: number;
  y: number;
  planets: Planet[];
  connections: string[];
  starClass: StarSpectralClass;
  richness: number;
  anomaly: SystemAnomaly | null;
  exploredBy: Record<string, boolean>;
  systemType: SystemType;
  orbitalStationOwnerId: string | null;
  siegeBlockaders: string[];
  specialization?: SystemSpecialization | null;
}

export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: number;
  prerequisites: string[];
  unlocks: string[];
  category: 'military' | 'economy' | 'exploration' | 'science';
  branch?: TechBranch;
  repeatable?: boolean;
  maxRepeats?: number;
}

export interface Empire {
  id: string;
  name: string;
  color: string;
  emblem: EmblemId;
  trait: EmpireTrait;
  isPlayer: boolean;
  isAlive: boolean;
  resources: Resources;
  strategicResources: StrategicResources;
  researchedTechs: string[];
  currentResearch: string | null;
  researchProgress: number;
  researchQueue: string | null;
  knownSystems: Set<string>;
  visibleSystems: Set<string>;
  diplomacy: Record<string, DiplomacyState>;
  totalPlanets: number;
  influence: number;
  influenceVictoryTurns: number;
  economyVictoryTurns?: number;
  warWeariness: number;
  capitalSystemId: string | null;
  score: number;
  leaderTitle?: string;
  relationScores?: Record<string, number>;
  warScores?: Record<string, number>;
  aiPersonality?: AIPersonality;
  aiGoal?: AIGoal;
  aiGoalTurn?: number;
  repeatableTechCounts?: Record<string, number>;
  factionResearchHint?: string;
  isPirate?: boolean;
  lastSeenSystems?: Record<string, number>;
  factionIndex?: number;
}

export interface ShipLossDetail {
  type: ShipType;
  count: number;
}

export interface BattleReport {
  systemId: string;
  attackerId: string;
  defenderId: string;
  winnerId: string;
  attackerLosses: number;
  defenderLosses: number;
  attackerPower: number;
  defenderPower: number;
  attackerShipLosses: ShipLossDetail[];
  defenderShipLosses: ShipLossDetail[];
  rounds: number;
  log: string[];
  retreated?: boolean;
  salvageCredits?: number;
  bombardmentDamage?: number;
}

export interface CombatResult extends BattleReport {}

export interface CombatPrediction {
  attackerWinChance: number;
  estimatedRounds: number;
  attackerPower: number;
  defenderPower: number;
}

export interface EconomyBreakdown {
  income: Resources;
  expenses: Resources & { fleetUpkeep: number; maintenance: number };
  net: Resources;
}

export interface TurnSummary {
  turn: number;
  production: Resources;
  populationGrowth: number;
  battles: number;
  captures: number;
  influenceGained: number;
  colonizationsCompleted?: number;
  researchCompleted?: number;
  economy?: EconomyBreakdown;
}

export interface ColonizationProject {
  id: string;
  planetId: string;
  systemId: string;
  empireId: string;
  turnsRemaining: number;
  totalTurns: number;
  usedColonyShip: boolean;
}

export interface PlayerDecision {
  id: string;
  empireId: string;
  decisionType: string;
  title: string;
  description: string;
  choices: { id: string; label: string; hint?: string }[];
  turn: number;
  expiresTurn: number;
}

export interface DiplomaticProposal {
  id: string;
  fromEmpireId: string;
  toEmpireId: string;
  type: DiplomaticProposalType;
  turn: number;
  expiresTurn: number;
}

export interface VictoryProgress {
  domination: number;
  science: number;
  survival: number;
  influence: number;
  economy: number;
}

export interface GameEvent {
  turn: number;
  type:
    | 'colonize'
    | 'combat'
    | 'research'
    | 'diplomacy'
    | 'explore'
    | 'ai'
    | 'victory'
    | 'defeat'
    | 'building'
    | 'production'
    | 'anomaly'
    | 'event'
    | 'capture'
    | 'siege';
  message: string;
}

export interface EventChainState {
  chainId: string;
  empireId: string;
  step: number;
  turnsRemaining: number;
}

export interface GameSettings {
  difficulty: Difficulty;
  galaxySize: GalaxySizeOption;
  galaxyShape: GalaxyShape;
  maxTurns: number;
  empireCount: number;
}

export interface PlayerSetup {
  name: string;
  color: string;
  emblem: EmblemId;
  trait: EmpireTrait;
}

export interface SaveMetadata {
  turn: number;
  faction: string;
  seed: number;
  difficulty: Difficulty;
  galaxySize: GalaxySizeOption;
  galaxyShape: GalaxyShape;
  savedAt: string;
  slotId?: string;
}

export interface GameState {
  seed: number;
  turn: number;
  maxTurns: number;
  phase: GamePhase;
  victoryType: VictoryType;
  winnerId: string | null;
  systems: StarSystem[];
  empires: Empire[];
  fleets: Fleet[];
  playerEmpireId: string;
  selectedSystemId: string | null;
  selectedFleetId: string | null;
  events: GameEvent[];
  combatResults: CombatResult[];
  turnSummaries: TurnSummary[];
  settings: GameSettings;
  piratesSpawned?: boolean;
  pirateEmpireId?: string | null;
  activeEventChains?: EventChainState[];
  crisisWarned?: boolean;
  lastAutosaveTurn?: number;
  precursorLorePending?: string | null;
  diplomaticProposals?: DiplomaticProposal[];
  colonizationProjects?: ColonizationProject[];
  pendingDecisions?: PlayerDecision[];
}

export interface SerializedGameState {
  seed: number;
  turn: number;
  maxTurns: number;
  phase: GamePhase;
  victoryType: VictoryType;
  winnerId: string | null;
  systems: StarSystem[];
  empires: SerializedEmpire[];
  fleets: Fleet[];
  playerEmpireId: string;
  selectedSystemId: string | null;
  selectedFleetId: string | null;
  events: GameEvent[];
  combatResults: CombatResult[];
  turnSummaries?: TurnSummary[];
  settings?: GameSettings;
  piratesSpawned?: boolean;
  pirateEmpireId?: string | null;
  activeEventChains?: EventChainState[];
  crisisWarned?: boolean;
  lastAutosaveTurn?: number;
  precursorLorePending?: string | null;
  diplomaticProposals?: DiplomaticProposal[];
  colonizationProjects?: ColonizationProject[];
  pendingDecisions?: PlayerDecision[];
  saveMetadata?: SaveMetadata;
}

export interface SerializedEmpire {
  id: string;
  name: string;
  color: string;
  emblem?: EmblemId;
  trait?: EmpireTrait;
  isPlayer: boolean;
  isAlive: boolean;
  resources: Resources;
  strategicResources?: StrategicResources;
  researchedTechs: string[];
  currentResearch: string | null;
  researchProgress: number;
  researchQueue?: string | null;
  knownSystems: string[];
  visibleSystems: string[];
  diplomacy: Record<string, DiplomacyState>;
  totalPlanets: number;
  influence?: number;
  influenceVictoryTurns?: number;
  economyVictoryTurns?: number;
  warWeariness?: number;
  capitalSystemId?: string | null;
  score?: number;
  leaderTitle?: string;
  relationScores?: Record<string, number>;
  warScores?: Record<string, number>;
  aiPersonality?: AIPersonality;
  aiGoal?: AIGoal;
  aiGoalTurn?: number;
  repeatableTechCounts?: Record<string, number>;
  factionResearchHint?: string;
  isPirate?: boolean;
  lastSeenSystems?: Record<string, number>;
  factionIndex?: number;
}