import type { ReactNode } from 'react';
import type { AssetTooltipSpec, CanonLabel, RuntimeTooltipContext } from './types';

export function formatCanonLabel(label?: CanonLabel): string | null {
  switch (label) {
    case 'direct_canon': return 'Direct canon';
    case 'canon_faithful': return 'Canon-faithful adaptation';
    case 'interpretive': return 'Interpretive adaptation';
    default: return null;
  }
}

export function formatCostList(costs?: string[]): string | null {
  if (!costs?.length) return null;
  return costs.join(' · ');
}

export function formatEffectList(effects?: string[]): string | null {
  if (!effects?.length) return null;
  return effects.join(' · ');
}

export function formatRequirementList(requirements?: string[]): string | null {
  if (!requirements?.length) return null;
  return requirements.join(' · ');
}

export interface FormattedTooltipSections {
  title: string;
  mechanical: string;
  lore: string;
  warning?: string;
  requirements?: string;
  costs?: string;
  effects?: string;
  stateLabel?: string;
  canonLabel?: string;
  runtimeLines: string[];
}

export function formatAssetTooltip(
  data: AssetTooltipSpec & RuntimeTooltipContext,
): FormattedTooltipSections {
  const runtimeLines: string[] = [];

  if (data.value !== undefined) {
    runtimeLines.push(`Current: ${data.value}${data.delta ? ` (${data.delta})` : ''}`);
  }
  if (data.income !== undefined) {
    runtimeLines.push(`Income: +${data.income}`);
  }
  if (data.expense !== undefined && data.expense > 0) {
    runtimeLines.push(`Expenses: -${data.expense}`);
  }
  if (data.net !== undefined) {
    runtimeLines.push(`Net: ${data.net >= 0 ? '+' : ''}${data.net}`);
  }
  if (data.incomeNote) {
    runtimeLines.push(data.incomeNote);
  }
  if (data.durationTurns !== undefined) {
    runtimeLines.push(`Duration: ${data.durationTurns} turn(s) remaining`);
  }
  if (data.cooldownTurns !== undefined && data.cooldownTurns > 0) {
    runtimeLines.push(`Cooldown: ${data.cooldownTurns} turn(s)`);
  }
  if (data.progressPct !== undefined) {
    runtimeLines.push(`Progress: ${data.progressPct}%`);
  }
  if (data.invalidReason) {
    runtimeLines.push(`Blocked: ${data.invalidReason}`);
  }

  return {
    title: data.title,
    mechanical: data.mechanical,
    lore: data.lore,
    warning: data.warning,
    requirements: formatRequirementList(data.requirements) ?? undefined,
    costs: formatCostList(data.costs) ?? undefined,
    effects: formatEffectList(data.effects) ?? undefined,
    stateLabel: data.stateLabel ?? data.statusLabel,
    canonLabel: formatCanonLabel(data.canonLabel) ?? undefined,
    runtimeLines,
  };
}

export function tooltipSectionsToPlainText(sections: FormattedTooltipSections): string {
  const lines = [
    sections.title,
    sections.mechanical,
    ...sections.runtimeLines,
    sections.costs ? `Costs: ${sections.costs}` : '',
    sections.effects ? `Effects: ${sections.effects}` : '',
    sections.requirements ? `Requires: ${sections.requirements}` : '',
    sections.stateLabel ? `Status: ${sections.stateLabel}` : '',
    sections.warning ? `Warning: ${sections.warning}` : '',
    sections.lore,
    sections.canonLabel ?? '',
  ].filter(Boolean);
  return lines.join('\n');
}

export function hasTooltipContent(content: ReactNode): boolean {
  return content !== null && content !== undefined && content !== false;
}