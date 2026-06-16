import { buildRuntimeTooltip } from '../data/assets/resolve';
import { getMacro, getMacroCooldown, getAvailableMacros, MACROS } from '../game/macros';
import {
  formatActiveMacroEffect,
  getActiveMacroEffectsForSystem,
} from '../game/macroEffects';
import { formatStarsilkCost } from '../game/starsilkResources';
import { AssetIcon } from './AssetIcon';
import { StarsilkTooltipContent } from './StarsilkTooltip';
import { Tooltip } from './Tooltip';
import type { ActiveMacroEffect, GameState } from '../game/types';

interface Props {
  state: GameState;
  targetId: string;
  targetLabel: string;
  onExecute: (macroId: string) => void;
  canExecute: (macroId: string) => string | null;
}

function getMacroEffectMechanicalKey(effect: ActiveMacroEffect): string {
  if (effect.modifiers.singularitySeal) return 'macro-effect:singularitySeal';
  if (effect.modifiers.hazardSuppressed) return 'macro-effect:hazardSuppressed';
  if (effect.modifiers.defenseBonusPct) return 'macro-effect:defenseBonus';
  return `macro:${effect.macroId}`;
}

function buildMacroTooltipData(
  macroId: string,
  err: string | null,
  cooldown: number,
  costStr: string,
  unlocked: boolean,
) {
  const macro = getMacro(macroId);
  const costs = costStr ? [costStr] : undefined;
  return buildRuntimeTooltip(`macro:${macroId}`, {
    costs,
    cooldownTurns: cooldown,
    durationTurns: macro?.effectTurns,
    invalidReason: unlocked && err ? err : unlocked ? undefined : 'Macro locked — research required',
    effects: macro?.effectTurns ? [`Lasts ${macro.effectTurns} turns`] : undefined,
    statusLabel: !unlocked ? 'Locked' : err ? 'Blocked' : cooldown > 0 ? 'On cooldown' : 'Ready',
  });
}

export function MacroPanel({ state, targetId, targetLabel, onExecute, canExecute }: Props) {
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const available = new Set(getAvailableMacros(player).map(m => m.id));
  const activeEffects = getActiveMacroEffectsForSystem(state, targetId);

  return (
    <div className="macro-panel" data-testid="macro-panel">
      <div className="section-title">Macro Actions</div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8 }}>
        Target: {targetLabel}
      </p>

      {activeEffects.length > 0 && (
        <div className="macro-active-effects" data-testid="active-macro-effects">
          <div className="section-title" style={{ fontSize: '0.8rem' }}>Active Effects</div>
          {activeEffects.map(effect => {
            const macro = getMacro(effect.macroId);
            const owner = state.empires.find(e => e.id === effect.empireId);
            const effectKey = getMacroEffectMechanicalKey(effect);
            const tooltipData = buildRuntimeTooltip(effectKey, {
              durationTurns: effect.turnsRemaining,
              effects: [formatActiveMacroEffect(effect)],
              statusLabel: effect.turnsRemaining <= 1 ? 'Expiring' : 'Active',
              warning: effect.turnsRemaining <= 1 ? 'Effect expires next turn' : undefined,
            });
            return (
              <Tooltip
                key={effect.id}
                content={<StarsilkTooltipContent data={tooltipData} testId={`tooltip-${effectKey}`} compact />}
              >
                <div
                  className={`macro-active-item macro-active-item--${effectKey.includes('singularitySeal') ? 'seal' : effectKey.includes('hazardSuppressed') ? 'inerting' : 'default'}`}
                  data-testid={`active-macro-${effect.macroId}`}
                >
                  <AssetIcon mechanicalKey={effectKey} size={16} />
                  <span>{macro?.name ?? effect.macroId}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                    {owner?.name ?? effect.empireId} — {effect.turnsRemaining} turns left
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {formatActiveMacroEffect(effect)}
                  </span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      )}

      {MACROS.map(macro => {
        const unlocked = available.has(macro.id);
        const cooldown = getMacroCooldown(player, macro.id);
        const err = unlocked ? canExecute(macro.id) : 'Macro locked';
        const costStr = formatStarsilkCost(macro.cost);
        const tooltipData = buildMacroTooltipData(macro.id, err, cooldown, costStr, unlocked);
        const variantClass = `macro-item--${macro.category}`;

        return (
          <Tooltip
            key={macro.id}
            content={<StarsilkTooltipContent data={tooltipData} testId={`tooltip-macro-${macro.id}`} />}
          >
            <div
              className={`macro-item ${!unlocked ? 'macro-item--locked' : ''} ${variantClass}`}
              data-testid={`macro-${macro.id}`}
            >
              <div className="macro-item__header">
                <AssetIcon mechanicalKey={`macro:${macro.id}`} size={18} />
                <span>{macro.name}</span>
                {!unlocked && <span className="macro-item__badge">Locked</span>}
                {cooldown > 0 && <span className="macro-item__badge" data-testid={`macro-cd-${macro.id}`}>CD {cooldown}</span>}
                {macro.effectTurns > 0 && unlocked && (
                  <span className="macro-item__badge">{macro.effectTurns}t</span>
                )}
              </div>
              <p className="macro-item__desc">{macro.description}</p>
              {unlocked && costStr && (
                <p className="macro-item__cost">Cost: {costStr}</p>
              )}
              <p className="macro-item__risk">{macro.risk}</p>
              {err && unlocked && (
                <p className="macro-item__err" data-testid={`macro-err-${macro.id}`} style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>
                  {err}
                </p>
              )}
              {unlocked && (
                <button
                  className="btn btn-sm"
                  disabled={!!err || cooldown > 0}
                  title={err ?? undefined}
                  data-testid={`execute-macro-${macro.id}`}
                  onClick={() => onExecute(macro.id)}
                >
                  Execute
                </button>
              )}
            </div>
          </Tooltip>
        );
      })}
      <span data-testid="macro-target-id" style={{ display: 'none' }}>{targetId}</span>
    </div>
  );
}