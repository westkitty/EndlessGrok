import { acceptProposalAction, demandPeaceAction, demandTributeAction, rejectProposalAction, setDiplomacyAction } from '../game/actions';
import { getPendingProposalsForEmpire } from '../game/diplomaticProposals';
import { getBorderFrictionScore, getRelationScore, getWarScore } from '../game/diplomacy';
import { Icon } from './icons/Icon';
import { getEmblemIconName } from './icons/iconHelpers';
import type { DiplomacyState, GameEvent, GameState } from '../game/types';

interface Props {
  state: GameState;
  onUpdate: (state: GameState) => void;
}

function getDiplomacyBadgeClass(status: DiplomacyState): string {
  if (status === 'trade' || status === 'pact' || status === 'research_pact') return 'diplo-badge diplo-badge--pact';
  return `diplo-state diplo-${status}`;
}

function buildRelationTimeline(events: GameEvent[], empireName: string): GameEvent[] {
  return events
    .filter(e => e.type === 'diplomacy' && e.message.includes(empireName))
    .slice(-6)
    .reverse();
}

const PROPOSAL_LABELS: Record<string, string> = {
  trade: 'Trade Pact',
  pact: 'Non-Aggression Pact',
  research_pact: 'Research Pact',
  peace: 'Peace Treaty',
};

export function DiplomacyPanel({ state, onUpdate }: Props) {
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const others = state.empires.filter(e => e.id !== player.id && e.isAlive);
  const pendingProposals = getPendingProposalsForEmpire(state, player.id);

  const cloneState = () => ({
    ...state,
    empires: state.empires.map(e => ({
      ...e,
      diplomacy: { ...e.diplomacy },
      relationScores: { ...e.relationScores },
      warScores: { ...e.warScores },
      resources: { ...e.resources },
    })),
    events: [...state.events],
  });

  const handleDiplomacy = (targetId: string, newState: DiplomacyState) => {
    const newGameState = cloneState();
    if (setDiplomacyAction(newGameState, targetId, newState)) onUpdate(newGameState);
  };

  const handleDemandPeace = (targetId: string) => {
    const newGameState = cloneState();
    demandPeaceAction(newGameState, targetId);
    onUpdate(newGameState);
  };

  const handleDemandTribute = (targetId: string) => {
    const newGameState = cloneState();
    demandTributeAction(newGameState, targetId);
    onUpdate(newGameState);
  };

  const cloneForProposal = () => ({
    ...state,
    empires: state.empires.map(e => ({
      ...e,
      diplomacy: { ...e.diplomacy },
      relationScores: { ...e.relationScores },
    })),
    events: [...state.events],
    diplomaticProposals: [...(state.diplomaticProposals ?? [])],
  });

  return (
    <div className="panel-content panel-content--animated">
      {pendingProposals.length > 0 && (
        <div className="section panel-section--stagger-0" style={{ borderColor: 'var(--accent-violet)' }}>
          <div className="section-title">
            <Icon name="diplomacy" size={14} />
            Incoming Proposals ({pendingProposals.length})
          </div>
          {pendingProposals.map(proposal => {
            const from = state.empires.find(e => e.id === proposal.fromEmpireId);
            if (!from) return null;
            return (
              <div key={proposal.id} className="diplo-item" style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                  <span style={{ color: from.color, fontWeight: 600 }}>{from.name}</span>
                  {' '}proposes a <strong>{PROPOSAL_LABELS[proposal.type] ?? proposal.type}</strong>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}> (expires turn {proposal.expiresTurn})</span>
                </div>
                <div className="action-buttons" style={{ gap: 4 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => {
                    const s = cloneForProposal();
                    if (acceptProposalAction(s, proposal.id)) onUpdate(s);
                  }}>Accept</button>
                  <button className="btn btn-sm" onClick={() => {
                    const s = cloneForProposal();
                    if (rejectProposalAction(s, proposal.id)) onUpdate(s);
                  }}>Decline</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="section panel-section--stagger-0">
        <div className="section-title">
          <Icon name="diplomacy" size={14} />
          Diplomatic Relations
        </div>
        {others.map(empire => {
          const status = player.diplomacy[empire.id] || 'neutral';
          const relationScore = getRelationScore(player, empire.id);
          const warScore = getWarScore(player, empire.id);
          const borderFriction = getBorderFrictionScore(state, player, empire);
          const timeline = buildRelationTimeline(state.events, empire.name);
          return (
            <div key={empire.id} className="diplo-item">
              <div className="diplo-empire">
                <Icon name={getEmblemIconName(empire.emblem)} size={32} style={{ filter: `drop-shadow(0 0 6px ${empire.color})` }} />
                <div style={{ flex: 1 }}>
                  <div className="diplo-empire-name" style={{ color: empire.color }}>
                    {empire.leaderTitle ? `${empire.leaderTitle} of ${empire.name}` : empire.name}
                    {empire.isPirate && ' ☠'}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                    Planets: {empire.totalPlanets} | Techs: {empire.researchedTechs.length} | Score: {empire.score}
                  </div>
                  <div className="relation-bar" style={{ marginTop: 4 }}>
                    <div className="relation-bar__track">
                      <div
                        className="relation-bar__fill"
                        style={{
                          width: `${relationScore}%`,
                          background: relationScore >= 60 ? 'var(--accent-green)' : relationScore >= 30 ? 'var(--accent-gold)' : 'var(--accent-red)',
                        }}
                      />
                    </div>
                    <span className="relation-bar__label">Relation {relationScore}</span>
                  </div>
                  {status === 'war' && (
                    <div className="war-score-display">
                      War Score: <strong style={{ color: warScore >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{warScore}</strong>
                    </div>
                  )}
                  <div className="border-friction" style={{ marginTop: 4, fontSize: 'var(--text-xs)' }}>
                    Border friction:{' '}
                    <strong style={{
                      color: borderFriction >= 60 ? 'var(--accent-red)' : borderFriction >= 30 ? 'var(--accent-gold)' : 'var(--accent-green)',
                    }}>
                      {borderFriction}
                    </strong>
                  </div>
                </div>
              </div>
              <div>
                <span className={getDiplomacyBadgeClass(status)}>{status}</span>
                <div className="action-buttons" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                  {status === 'war' && (
                    <>
                      <button className="btn btn-sm btn-icon" onClick={() => handleDemandPeace(empire.id)}>
                        <Icon name="diplomacy" size={12} />
                        Demand Peace
                      </button>
                      <button className="btn btn-sm btn-icon" onClick={() => handleDemandTribute(empire.id)}>
                        <Icon name="credits" size={12} />
                        Demand Tribute
                      </button>
                    </>
                  )}
                  {status === 'neutral' && (
                    <>
                      <button className="btn btn-sm btn-icon" onClick={() => handleDiplomacy(empire.id, 'trade')}>
                        <Icon name="credits" size={12} />
                        Trade Pact
                      </button>
                      <button className="btn btn-sm btn-icon" onClick={() => handleDiplomacy(empire.id, 'pact')}>
                        <Icon name="diplomacy" size={12} />
                        NAP
                      </button>
                      <button className="btn btn-sm btn-icon" onClick={() => handleDiplomacy(empire.id, 'research_pact')}>
                        <Icon name="research" size={12} />
                        Research Pact
                      </button>
                    </>
                  )}
                  {status !== 'neutral' && status !== 'trade' && status !== 'pact' && status !== 'research_pact' && (
                    <button className="btn btn-sm btn-icon" onClick={() => handleDiplomacy(empire.id, 'neutral')}>
                      <Icon name="diplomacy" size={12} />
                      Peace
                    </button>
                  )}
                  {status === 'neutral' && (
                    <button className="btn btn-sm btn-danger btn-icon" onClick={() => handleDiplomacy(empire.id, 'hostile')}>
                      <Icon name="combat" size={12} />
                      Hostile
                    </button>
                  )}
                  {status !== 'war' && (
                    <button className="btn btn-sm btn-danger btn-icon" onClick={() => handleDiplomacy(empire.id, 'war')}>
                      <Icon name="combat" size={12} />
                      War
                    </button>
                  )}
                </div>
                {timeline.length > 0 && (
                  <div className="diplo-timeline">
                    <div className="diplo-timeline__title">Relation History</div>
                    {timeline.map((ev, i) => (
                      <div key={`${ev.turn}-${i}`} className="diplo-timeline__entry">
                        <span className="diplo-timeline__turn">T{ev.turn}</span>
                        <span className="diplo-timeline__dot" />
                        <span className="diplo-timeline__msg">{ev.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}