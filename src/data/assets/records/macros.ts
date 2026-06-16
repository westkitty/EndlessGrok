import type { AssetRecord } from '../types';
import { MACROS } from '../../../game/macros';

const MACRO_ICON_FALLBACK: Record<string, AssetRecord['fallbackIconName']> = {
  stability: 'diplomacy',
  terraform: 'colony',
  inerting: 'research',
  fortification: 'industry',
  extraction: 'science',
  biosphere: 'combat',
  seal: 'anomaly',
  counter: 'combat',
};

const MACRO_VARIANT: Record<string, AssetRecord['visualVariant']> = {
  inerting: 'inerting',
  seal: 'seal',
  counter: 'counter',
  biosphere: 'catastrophic',
};

function macroAsset(macro: (typeof MACROS)[number]): AssetRecord {
  return {
    id: `macro-${macro.id}`,
    mechanicalKey: `macro:${macro.id}`,
    displayName: macro.name,
    family: 'macros',
    states: ['locked', 'ready', 'cooldown', 'active'],
    mechanicalMeaning: macro.description,
    loreMeaning: macro.loreBasis,
    accessibilityLabel: macro.name,
    tooltip: {
      title: macro.name,
      mechanical: macro.description,
      lore: macro.loreBasis,
      warning: macro.risk !== 'None documented' ? macro.risk : undefined,
      effects: macro.effectTurns > 0 ? [`Lasts ${macro.effectTurns} turns`] : undefined,
      canonLabel: 'canon_faithful',
    },
    testId: `macro-icon-${macro.id}`,
    sourceBasis: 'macro definitions',
    status: 'planned',
    fallbackIconName: MACRO_ICON_FALLBACK[macro.category] ?? 'anomaly',
    visualVariant: MACRO_VARIANT[macro.category] ?? 'default',
    plannedFiles: { svg: `src/assets/icons/macros/${macro.id}.svg` },
  };
}

export const MACRO_ASSETS: AssetRecord[] = MACROS.map(macroAsset);

export const MACRO_EFFECT_ASSETS: AssetRecord[] = [
  {
    id: 'macro-effect-hazard-suppressed',
    mechanicalKey: 'macro-effect:hazardSuppressed',
    displayName: 'Hazard Suppressed',
    family: 'macros',
    states: ['active', 'expiring'],
    mechanicalMeaning: 'Reduces singularity fleet hazard and collapse damage in system.',
    loreMeaning: 'Syrin inerting mist holds thread bleed locally.',
    accessibilityLabel: 'Hazard suppressed',
    tooltip: {
      title: 'Hazard Suppressed',
      mechanical: 'Fleet hazard chance reduced. Collapse population loss mitigated. Not safe.',
      lore: 'Inerting buys time — it does not erase the wound.',
      warning: 'Mitigation is not safety.',
      stateLabel: 'Inerting protection',
      canonLabel: 'direct_canon',
    },
    testId: 'macro-effect-hazard-suppressed',
    sourceBasis: 'macro effect modifiers',
    status: 'planned',
    fallbackIconName: 'research',
    visualVariant: 'inerting',
    plannedFiles: { svg: 'src/assets/icons/macros/hazard-suppressed.svg' },
  },
  {
    id: 'macro-effect-singularity-seal',
    mechanicalKey: 'macro-effect:singularitySeal',
    displayName: 'Singularity Seal',
    family: 'macros',
    states: ['active', 'expiring'],
    mechanicalMeaning: 'Stronger hazard mitigation via gravity thread seal.',
    loreMeaning: 'Partition geometry pinned over a collapsing lane.',
    accessibilityLabel: 'Singularity seal active',
    tooltip: {
      title: 'Singularity Seal',
      mechanical: 'Strongest hazard mitigation. Heliocide and collapse still possible.',
      lore: 'Seal stitches gravity — the ledger still remembers what was burned.',
      warning: 'Sealed systems remain hazardous.',
      stateLabel: 'Seal active',
      canonLabel: 'direct_canon',
    },
    testId: 'macro-effect-singularity-seal',
    sourceBasis: 'macro effect modifiers',
    status: 'planned',
    fallbackIconName: 'anomaly',
    visualVariant: 'seal',
    plannedFiles: { svg: 'src/assets/icons/macros/singularity-seal.svg' },
  },
  {
    id: 'macro-effect-defense-bonus',
    mechanicalKey: 'macro-effect:defenseBonus',
    displayName: 'Defense Bonus',
    family: 'macros',
    states: ['active'],
    mechanicalMeaning: 'Temporary system defense increase from audit or lattice anchor.',
    loreMeaning: 'Administrative or lattice enforcement hardens the chokepoint.',
    accessibilityLabel: 'Defense bonus active',
    tooltip: {
      title: 'Defense Bonus',
      mechanical: 'Increases system defense percentage while active.',
      lore: 'Order and lattice geometry stiffen the lane.',
      canonLabel: 'interpretive',
    },
    testId: 'macro-effect-defense-bonus',
    sourceBasis: 'macro effect modifiers',
    status: 'planned',
    fallbackIconName: 'diplomacy',
    plannedFiles: { svg: 'src/assets/icons/macros/defense-bonus.svg' },
  },
];