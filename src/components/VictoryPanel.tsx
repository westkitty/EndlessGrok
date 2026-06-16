import { getVictoryProgress } from '../game/victory';
import {
  STARBINDING_STAGE_LABELS,
  getRequiredStarDives,
  getStarbindingNextAction,
  getStarbindingStage,
  isStarbindingUnlocked,
} from '../game/starbinding';
import { isCollapsedSystem } from '../game/heliocide';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
}

interface VictoryPathDef {
  id: keyof ReturnType<typeof getVictoryProgress>;
  label: string;
  description: string;
  implemented: boolean;
}

const VICTORY_PATHS: VictoryPathDef[] = [
  {
    id: 'starbinding',
    label: 'The Starbinding',
    description: 'Catastrophic Partition victory via heliocide and macro execution',
    implemented: true,
  },
  {
    id: 'ledgerDominion',
    label: 'Ledger Dominion',
    description: 'Administration containment and influence hegemony',
    implemented: false,
  },
  {
    id: 'bloodEclipse',
    label: 'Blood Eclipse',
    description: 'Drakken biosphere terraforming victory',
    implemented: false,
  },
  {
    id: 'archiveContinuity',
    label: 'Archive Continuity',
    description: 'Preservation and research syntax victory',
    implemented: false,
  },
  {
    id: 'syrinInerting',
    label: 'Syrin Inerting',
    description: 'Containment and safety victory',
    implemented: false,
  },
  {
    id: 'domination',
    label: 'Domination',
    description: 'Control colonizable worlds',
    implemented: true,
  },
  {
    id: 'science',
    label: 'Science',
    description: 'Quantum computing and tech threshold',
    implemented: true,
  },
];

export function VictoryPanel({ state }: Props) {
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const progress = getVictoryProgress(state);
  const sbStage = getStarbindingStage(player);
  const sbUnlocked = isStarbindingUnlocked(player);
  const requiredDives = getRequiredStarDives(state);
  const completedDives = player.starbinding?.completedDiveSystemIds.length ?? 0;
  const collapsedCount = state.systems.filter(s => isCollapsedSystem(s)).length;
  const nextAction = getStarbindingNextAction(player, state);

  return (
    <div className="victory-panel" data-testid="victory-panel">
      <div className="section-title">Victory Paths</div>
      {VICTORY_PATHS.map(path => {
        const pct = Math.round((progress[path.id] ?? 0) * 100);
        const isStarbinding = path.id === 'starbinding';
        return (
          <div
            key={path.id}
            className={`victory-path ${!path.implemented ? 'victory-path--locked' : ''}`}
            data-testid={`victory-path-${path.id}`}
          >
            <div className="victory-path__header">
              <span className="victory-path__label">{path.label}</span>
              {!path.implemented && <span className="victory-path__badge">Future</span>}
              {path.implemented && <span className="victory-path__pct">{pct}%</span>}
            </div>
            <p className="victory-path__desc">{path.description}</p>
            {path.implemented && (
              <div className="victory-path__track">
                <div className="victory-path__fill" style={{ width: `${pct}%` }} />
              </div>
            )}
            {isStarbinding && (
              <div className="starbinding-details" data-testid="starbinding-details">
                <div className="info-row">
                  <span>Status</span>
                  <span>{sbUnlocked ? STARBINDING_STAGE_LABELS[sbStage] ?? `Stage ${sbStage}` : STARBINDING_STAGE_LABELS[0]}</span>
                </div>
                {sbUnlocked && (
                  <>
                    <div className="info-row" data-testid="starbinding-prerequisites">
                      <span>Star dives</span>
                      <span>{completedDives}/{requiredDives}</span>
                    </div>
                    <div className="info-row">
                      <span>Inert stabilized</span>
                      <span>{player.starbinding?.inertStarsilkStabilized ?? 0}/5</span>
                    </div>
                    <div className="info-row">
                      <span>Collapsed systems</span>
                      <span data-testid="collapsed-system-count">{collapsedCount}</span>
                    </div>
                    <div className="info-row">
                      <span>Next action</span>
                      <span data-testid="starbinding-next-action">{nextAction}</span>
                    </div>
                    <p className="starbinding-warning" data-testid="heliocide-warning">
                      Heliocide is irreversible. Collapsed stars become ledgered singularities.
                    </p>
                  </>
                )}
                {!sbUnlocked && (
                  <p className="starbinding-warning" data-testid="starbinding-locked-msg">
                    Research Forbidden Starbinding Theory to unlock this path.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}