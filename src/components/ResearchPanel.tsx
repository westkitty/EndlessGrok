import { useState } from 'react';
import { canStartResearch, startResearch } from '../game/actions';
import {
  getTechnology,
  getTechBranchLabel,
  getTechCategoryCounts,
  getTechTreeLayout,
  getTechUnlockPreview,
} from '../game/research';
import { Icon } from './icons/Icon';
import { Tooltip } from './Tooltip';
import { cloneGameState } from '../game/clone';
import type { GameState, Technology } from '../game/types';

interface Props {
  state: GameState;
  onUpdate: (state: GameState) => void;
}

const CATEGORY_ICONS: Record<string, Parameters<typeof Icon>[0]['name']> = {
  military: 'combat',
  economy: 'industry',
  exploration: 'scout',
  science: 'research',
};

const CATEGORY_COLORS: Record<string, string> = {
  military: '#ff6b6b',
  economy: '#ffd93d',
  exploration: '#6bcb77',
  science: '#4d96ff',
};

type CategoryFilter = Technology['category'] | 'all';

export function ResearchPanel({ state, onUpdate }: Props) {
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const treeLayout = getTechTreeLayout();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const categoryCounts = getTechCategoryCounts(player.researchedTechs);

  const hasSecondSlot = player.researchedTechs.includes('advanced_manufacturing');

  const recentTechs = [...player.researchedTechs]
    .reverse()
    .slice(0, 5)
    .map(id => getTechnology(id))
    .filter((t): t is Technology => !!t);

  const handleResearch = (techId: string, useQueue = false) => {
    const newState = cloneGameState(state);
    if (startResearch(newState, techId, useQueue)) onUpdate(newState);
  };

  const maxRow = Math.max(...treeLayout.map(t => t.row));
  const maxCol = Math.max(...treeLayout.map(t => t.col));

  return (
    <div className="panel-content">
      <div className="section">
        <div className="section-title">
          <Icon name="science" size={14} />
          Science Output: {player.resources.science}/turn
        </div>
        {player.factionResearchHint && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8 }}>
            Faction hint: {player.factionResearchHint}
          </p>
        )}
        {player.currentResearch && (() => {
          const tech = treeLayout.find(t => t.tech.id === player.currentResearch)?.tech;
          if (!tech) return null;
          const progress = Math.min(100, (player.researchProgress / tech.cost) * 100);
          const unlocks = getTechUnlockPreview(tech.id);
          const turnsLeft = player.resources.science > 0
            ? Math.ceil((tech.cost - player.researchProgress) / player.resources.science)
            : null;
          return (
            <div className="tech-item active">
              <div className="tech-header">
                <Icon name="research" size={20} />
                <div className="tech-name">Primary Slot: {tech.name}</div>
              </div>
              <div className="tech-desc">{tech.description}</div>
              {unlocks.length > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
                  Unlocks: {unlocks.join(', ')}
                </div>
              )}
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="tech-cost">
                {player.researchProgress} / {tech.cost}
                {turnsLeft !== null && ` · ~${turnsLeft} turn${turnsLeft !== 1 ? 's' : ''} remaining`}
              </div>
            </div>
          );
        })()}
        {player.researchQueue && (() => {
          const tech = getTechnology(player.researchQueue);
          if (!tech) return null;
          const unlocks = getTechUnlockPreview(tech.id);
          return (
            <div className="tech-item" style={{ marginTop: 8, borderColor: 'var(--accent-violet)' }}>
              <div className="tech-header">
                <Icon name="research" size={16} />
                <div className="tech-name">Queued: {tech.name}</div>
              </div>
              {unlocks.length > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
                  Will unlock: {unlocks.join(', ')}
                </div>
              )}
              <button className="btn btn-sm" style={{ marginTop: 4 }} onClick={() => {
                const newState = cloneGameState(state);
                const p = newState.empires.find(e => e.id === player.id)!;
                p.researchQueue = null;
                onUpdate(newState);
              }}>Cancel Queue</button>
            </div>
          );
        })()}
        {hasSecondSlot && !player.researchQueue && player.currentResearch && (
          <p style={{ fontSize: '0.7rem', color: 'var(--accent-violet)', marginTop: 6 }}>
            Secondary research slot available — click a tech and choose Queue, or click when primary slot is busy.
          </p>
        )}
      </div>

      {recentTechs.length > 0 && (
        <div className="section">
          <div className="section-title">Recent Research</div>
          <div style={{ fontSize: '0.75rem' }}>
            {recentTechs.map(tech => (
              <div key={tech.id} style={{ marginBottom: 4, color: CATEGORY_COLORS[tech.category] }}>
                ✓ {tech.name} <span style={{ color: 'var(--text-dim)' }}>({tech.category})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">
          Tech Tree ({player.researchedTechs.length}/{treeLayout.length})
        </div>
        <div className="action-buttons" style={{ flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          <button
            className={`btn btn-sm ${categoryFilter === 'all' ? 'btn-primary' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            All
          </button>
          {(['military', 'economy', 'exploration', 'science'] as const).map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : ''}`}
              onClick={() => setCategoryFilter(cat)}
              style={{ borderColor: CATEGORY_COLORS[cat] }}
            >
              {cat} ({categoryCounts[cat]})
            </button>
          ))}
        </div>
        <div
          className="tech-tree"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${maxCol + 2}, minmax(80px, 1fr))`,
            gridTemplateRows: `repeat(${maxRow + 2}, auto)`,
            gap: 6,
            marginTop: 8,
          }}
        >
          {treeLayout
            .filter(({ tech }) => categoryFilter === 'all' || tech.category === categoryFilter)
            .map(({ row, col, tech }) => {
            const researched = tech.repeatable
              ? (player.repeatableTechCounts?.[tech.id] ?? 0) >= (tech.maxRepeats ?? 1)
              : player.researchedTechs.includes(tech.id);
            const isActive = player.currentResearch === tech.id;
            const primaryErr = researched || isActive ? null : canStartResearch(state, tech.id, false);
            const queueErr = researched ? null : canStartResearch(state, tech.id, true);
            const canQueue = hasSecondSlot && !queueErr && !researched && player.currentResearch && player.currentResearch !== tech.id;
            const available = !primaryErr && !researched && !isActive;
            const catIcon = CATEGORY_ICONS[tech.category] || 'research';
            const catColor = CATEGORY_COLORS[tech.category] ?? '#888';
            const branchLabel = tech.branch ? getTechBranchLabel(tech.branch) : '';
            const unlocks = getTechUnlockPreview(tech.id);

            return (
              <Tooltip key={tech.id} content={primaryErr || `${tech.description}${unlocks.length ? ` → ${unlocks.join(', ')}` : ''}`} position="left">
                <div
                  className={`tech-item ${researched ? 'researched' : ''} ${isActive ? 'active' : ''} ${available ? 'available' : ''}`}
                  style={{
                    gridRow: row + 1,
                    gridColumn: col + 2,
                    borderLeft: `3px solid ${catColor}`,
                    fontSize: '0.8rem',
                    padding: 6,
                  }}
                  onClick={() => available && handleResearch(tech.id, false)}
                >
                  <div className="tech-header">
                    <Icon name={catIcon} size={14} />
                    <div className="tech-name">{tech.name} {researched ? '✓' : ''}</div>
                  </div>
                  {branchLabel && (
                    <div style={{ fontSize: '0.65rem', color: catColor, opacity: 0.85 }}>{branchLabel}</div>
                  )}
                  <div className="tech-desc" style={{ fontSize: '0.7rem' }}>{tech.description}</div>
                  {!researched && unlocks.length > 0 && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--success)' }}>
                      Unlocks: {unlocks.join(', ')}
                    </div>
                  )}
                  {!researched && (
                    <div className="tech-cost" style={{ fontSize: '0.7rem' }}>
                      <Icon name="science" size={10} /> {tech.cost}
                      {tech.repeatable && ` (${player.repeatableTechCounts?.[tech.id] ?? 0}/${tech.maxRepeats ?? 1})`}
                    </div>
                  )}
                  {canQueue && (
                    <button
                      className="btn btn-sm"
                      style={{ marginTop: 4, fontSize: '0.65rem', padding: '2px 6px' }}
                      onClick={(e) => { e.stopPropagation(); handleResearch(tech.id, true); }}
                    >
                      Queue
                    </button>
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}