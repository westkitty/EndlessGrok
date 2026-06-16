import {
  ECONOMY_VICTORY_CREDITS_THRESHOLD,
  ECONOMY_VICTORY_INCOME_THRESHOLD,
  ECONOMY_VICTORY_TURNS,
  INFLUENCE_VICTORY_THRESHOLD,
  INFLUENCE_VICTORY_TURNS,
} from '../game/constants';
import { getVictoryProgress } from '../game/victory';
import { Tooltip } from './Tooltip';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
}

export function VictoryProgress({ state }: Props) {
  const progress = getVictoryProgress(state);
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;

  const BARS = [
    { key: 'domination' as const, label: 'Domination', color: 'var(--danger)', hint: '60% of colonizable planets' },
    { key: 'science' as const, label: 'Science', color: 'var(--accent-cyan)', hint: 'Quantum Computing + 16 techs' },
    { key: 'economy' as const, label: 'Economy', color: 'var(--res-credits)', hint: `Galactic Market + ${ECONOMY_VICTORY_CREDITS_THRESHOLD} credits + ${ECONOMY_VICTORY_INCOME_THRESHOLD}/turn income for ${ECONOMY_VICTORY_TURNS} turns` },
    { key: 'influence' as const, label: 'Influence', color: 'var(--res-influence)', hint: `${INFLUENCE_VICTORY_THRESHOLD} influence for ${INFLUENCE_VICTORY_TURNS} turns (${player.influenceVictoryTurns}/${INFLUENCE_VICTORY_TURNS} held)` },
    { key: 'survival' as const, label: 'Survival', color: 'var(--accent-gold)', hint: 'Highest score at max turns' },
  ];

  return (
    <div className="victory-progress" aria-label="Victory progress">
      {BARS.map(bar => (
        <Tooltip key={bar.key} content={bar.hint}>
          <div className="victory-progress__item">
            <span className="victory-progress__label">{bar.label}</span>
            <div className="victory-progress__track">
              <div
                className="victory-progress__fill"
                style={{
                  width: `${Math.round(progress[bar.key] * 100)}%`,
                  background: `linear-gradient(90deg, ${bar.color}, ${bar.color}88)`,
                }}
              />
            </div>
            <span className="victory-progress__pct">{Math.round(progress[bar.key] * 100)}%</span>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}