import { getVictoryProgress } from '../game/victory';
import { getVictoryPathInfo, getFoundationProgressLabel } from '../game/victoryFoundations';
import { getVisibleRivalStarbindingProgress } from '../game/aiStarbinding';
import {
  STARBINDING_STAGE_LABELS,
  getRequiredStarDives,
  getStarbindingNextAction,
  getStarbindingStage,
  isStarbindingUnlocked,
} from '../game/starbinding';
import { isCollapsedSystem } from '../game/heliocide';
import {
  canAchieveSyrinInertingVictory,
  getSyrinInertingVictoryDetails,
  isSyrinInertingUnlocked,
  SYRIN_INERTING_MIN_INERT,
  SYRIN_INERTING_MIN_MIST_APPLICATIONS,
  SYRIN_INERTING_REQUIRED_SYSTEMS,
} from '../game/syrinInertingVictory';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
}

interface VictoryPathDef {
  id: keyof ReturnType<typeof getVictoryProgress>;
  label: string;
  description: string;
}

const VICTORY_PATHS: VictoryPathDef[] = [
  {
    id: 'starbinding',
    label: 'The Starbinding',
    description: 'Catastrophic Partition victory via heliocide and macro execution',
  },
  {
    id: 'ledgerDominion',
    label: 'Ledger Dominion',
    description: 'Administration containment and influence hegemony',
  },
  {
    id: 'bloodEclipse',
    label: 'Blood Eclipse',
    description: 'Drakken biosphere terraforming victory',
  },
  {
    id: 'archiveContinuity',
    label: 'Archive Continuity',
    description: 'Preservation and research syntax victory',
  },
  {
    id: 'syrinInerting',
    label: 'Syrin Inerting',
    description: 'Containment and safety victory',
  },
  {
    id: 'domination',
    label: 'Domination',
    description: 'Control colonizable worlds',
  },
  {
    id: 'science',
    label: 'Science',
    description: 'Quantum computing and tech threshold',
  },
];

function statusBadge(status: string, completable: boolean): string {
  if (status === 'complete' && completable) return 'Implemented';
  if (status === 'complete') return 'Implemented';
  if (status === 'foundation') return 'Foundation';
  return 'Locked';
}

export function VictoryPanel({ state }: Props) {
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const progress = getVictoryProgress(state);
  const pathInfo = getVictoryPathInfo(state, player.id);
  const rivals = getVisibleRivalStarbindingProgress(state, player.id);
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
        const info = pathInfo.find(p => p.id === path.id);
        const status = info?.status ?? 'locked';
        const pct = Math.round((progress[path.id] ?? 0) * 100);
        const isStarbinding = path.id === 'starbinding';
        const isSyrinInerting = path.id === 'syrinInerting';
        const syrinDetails = isSyrinInerting ? getSyrinInertingVictoryDetails(player) : null;
        const syrinBlock = isSyrinInerting ? canAchieveSyrinInertingVictory(state, player.id) : null;
        const showTrack = status === 'complete' || status === 'foundation';
        const badge = statusBadge(status, info?.completable ?? false);

        return (
          <div
            key={path.id}
            className={`victory-path ${status === 'locked' ? 'victory-path--locked' : ''}`}
            data-testid={`victory-path-${path.id}`}
            data-victory-status={status}
          >
            <div className="victory-path__header">
              <span className="victory-path__label">{path.label}</span>
              <span className="victory-path__badge" data-testid={`victory-badge-${path.id}`}>{badge}</span>
              {showTrack && <span className="victory-path__pct">{pct}%</span>}
            </div>
            <p className="victory-path__desc">{path.description}</p>
            {info?.foundationNote && (
              <p className="victory-path__foundation" data-testid={`victory-foundation-${path.id}`}>
                {info.foundationNote}
              </p>
            )}
            {status === 'foundation' && pct > 0 && (
              <p className="victory-path__foundation-label">{getFoundationProgressLabel(pct / 100)}</p>
            )}
            {showTrack && (
              <div className="victory-path__track">
                <div className="victory-path__fill" style={{ width: `${pct}%` }} />
              </div>
            )}
            {isSyrinInerting && isSyrinInertingUnlocked(player) && syrinDetails && (
              <div className="syrin-inerting-details" data-testid="syrin-inerting-details">
                <div className="info-row">
                  <span>Inert Starsilk</span>
                  <span data-testid="syrin-inert-count">{syrinDetails.inertStarsilk}/{SYRIN_INERTING_MIN_INERT}</span>
                </div>
                <div className="info-row">
                  <span>Systems protected</span>
                  <span data-testid="syrin-systems-protected">{syrinDetails.systemsProtected}/{SYRIN_INERTING_REQUIRED_SYSTEMS}</span>
                </div>
                <div className="info-row">
                  <span>Mist applications</span>
                  <span data-testid="syrin-mist-count">{syrinDetails.mistApplications}/{SYRIN_INERTING_MIN_MIST_APPLICATIONS}</span>
                </div>
                {syrinDetails.heliocideDisqualified && (
                  <p className="starbinding-warning" data-testid="syrin-heliocide-block">
                    Heliocide disqualifies containment victory.
                  </p>
                )}
                {syrinBlock && (
                  <p className="victory-path__foundation" data-testid="syrin-victory-block">{syrinBlock}</p>
                )}
                {!syrinBlock && pct >= 1 && (
                  <p className="victory-path__foundation" data-testid="syrin-victory-ready">Containment victory achievable.</p>
                )}
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

      {rivals.length > 0 && (
        <div className="rival-starbinding" data-testid="rival-starbinding-progress">
          <div className="section-title">Rival Starbinding</div>
          {rivals.map(r => (
            <div key={r.empireId} className="info-row" data-testid={`rival-sb-${r.empireId}`}>
              <span>{r.empireName}</span>
              <span>Stage {r.stage} — {Math.round(r.progress * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}