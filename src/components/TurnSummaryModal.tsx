import { Icon } from './icons/Icon';
import type { Resources, TurnSummary } from '../game/types';

interface Props {
  summary: TurnSummary | null;
  resourceDeltas?: Partial<Resources>;
  onClose: () => void;
}

export function TurnSummaryModal({ summary, resourceDeltas, onClose }: Props) {
  if (!summary) return null;

  const deltas = resourceDeltas ?? {};
  const economy = summary.economy;

  return (
    <div className="overlay turn-summary-overlay" onClick={onClose}>
      <div className="overlay-content turn-summary-modal" onClick={e => e.stopPropagation()}>
        <h2>Turn {summary.turn} Summary</h2>
        <div className="turn-summary-grid">
          <div className="turn-summary-stat">
            <Icon name="combat" size={20} />
            <span>{summary.battles} battle{summary.battles !== 1 ? 's' : ''}</span>
          </div>
          <div className="turn-summary-stat">
            <Icon name="fleet" size={20} />
            <span>{summary.captures} capture{summary.captures !== 1 ? 's' : ''}</span>
          </div>
          <div className="turn-summary-stat">
            <Icon name="influence" size={20} />
            <span>{summary.influenceGained >= 0 ? '+' : ''}{summary.influenceGained} influence</span>
          </div>
          {(summary.colonizationsCompleted ?? 0) > 0 && (
            <div className="turn-summary-stat">
              <Icon name="colony" size={20} />
              <span>{summary.colonizationsCompleted} colonization{(summary.colonizationsCompleted ?? 0) !== 1 ? 's' : ''} completed</span>
            </div>
          )}
          {(summary.researchCompleted ?? 0) > 0 && (
            <div className="turn-summary-stat">
              <Icon name="research" size={20} />
              <span>{summary.researchCompleted} research completed</span>
            </div>
          )}
        </div>

        {economy && (
          <div className="section" style={{ marginTop: 16 }}>
            <div className="section-title">Income / Expenses</div>
            {(['credits', 'food', 'industry', 'science'] as const).map(key => (
              <div key={key} className="info-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={key} size={14} />
                  {key} income
                </span>
                <span className="positive" style={{ color: 'var(--success)' }}>+{economy.income[key]}</span>
              </div>
            ))}
            <div className="info-row">
              <span>Fleet upkeep</span>
              <span className="negative" style={{ color: 'var(--danger)' }}>-{economy.expenses.fleetUpkeep}</span>
            </div>
            <div className="info-row">
              <span>Maintenance</span>
              <span className="negative" style={{ color: 'var(--danger)' }}>-{economy.expenses.maintenance}</span>
            </div>
          </div>
        )}

        <div className="section" style={{ marginTop: 16 }}>
          <div className="section-title">Resource Deltas</div>
          {(['credits', 'food', 'industry', 'science'] as const).map(key => {
            const delta = deltas[key];
            if (delta === undefined || delta === 0) return null;
            return (
              <div key={key} className="info-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={key} size={14} />
                  {key}
                </span>
                <span className={delta > 0 ? 'positive' : 'negative'} style={{ color: delta > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              </div>
            );
          })}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}