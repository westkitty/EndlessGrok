import type { AssetRecord } from '../types';

function uiAsset(
  id: string,
  mechanicalKey: string,
  displayName: string,
  mechanical: string,
  lore: string,
  sourceBasis: AssetRecord['sourceBasis'],
  extra: Partial<AssetRecord> = {},
): AssetRecord {
  return {
    id,
    mechanicalKey,
    displayName,
    family: 'ui',
    states: ['default'],
    mechanicalMeaning: mechanical,
    loreMeaning: lore,
    accessibilityLabel: displayName,
    tooltip: { title: displayName, mechanical, lore, canonLabel: 'canon_faithful' },
    testId: id,
    sourceBasis,
    status: 'generated',
    fallbackIconName: 'fleet',
    plannedFiles: { svg: `public/assets/icons/ui/${id}.svg` },
    ...extra,
  };
}

export const UI_ASSETS: AssetRecord[] = [
  uiAsset('ui-panel-header-research', 'ui:panel-header-research', 'Research Panel Header', 'Research terminal panel chrome.', 'Archive syntax surfaced for study.', 'mechanical UI necessity'),
  uiAsset('ui-panel-header-fleet-manager', 'ui:panel-header-fleet-manager', 'Fleet Manager Panel Header', 'Fleet manager panel chrome.', 'Operational syntax for deployed groups.', 'mechanical UI necessity'),
  uiAsset('ui-panel-header-macro-panel', 'ui:panel-header-macro-panel', 'Macro Panel Header', 'Macro operations panel chrome.', 'Partition tools under audit framing.', 'mechanical UI necessity'),
  uiAsset('ui-panel-header-victory', 'ui:panel-header-victory', 'Victory Panel Header', 'Victory path panel chrome.', 'End-state routes under ledger review.', 'mechanical UI necessity'),
  uiAsset('ui-panel-header-diplomacy', 'ui:panel-header-diplomacy', 'Diplomacy Panel Header', 'Diplomacy panel chrome.', 'Faction relations under containment audit.', 'mechanical UI necessity'),
  uiAsset('ui-tooltip-system-frame', 'ui:tooltip-system-frame', 'Tooltip System Frame', 'Standard tooltip border frame.', 'Mechanical and lore summaries in one surface.', 'mechanical UI necessity'),
  uiAsset('ui-warning-heliocide-modal', 'ui:warning-heliocide-modal', 'Heliocide Warning Modal', 'Irreversible heliocide confirmation chrome.', 'Star severance cannot be appealed.', 'direct canon', { visualVariant: 'catastrophic', tooltip: { title: 'Heliocide Warning', mechanical: 'Confirms irreversible star collapse.', lore: 'Partition math admits no reversal.', warning: 'Irreversible.', canonLabel: 'direct_canon' } }),
  uiAsset('ui-warning-starbinding-modal', 'ui:warning-starbinding-modal', 'Starbinding Warning Modal', 'Starbinding escalation confirmation chrome.', 'Archive dive targeting flashpoint.', 'direct canon', { visualVariant: 'catastrophic' }),
  uiAsset('ui-warning-war-move-modal', 'ui:warning-war-move-modal', 'War Move Warning Modal', 'Hostile transit confirmation chrome.', 'Movement through contested lanes.', 'mechanical UI necessity', { visualVariant: 'hazard' }),
  uiAsset('ui-warning-production-cancel-modal', 'ui:warning-production-cancel-modal', 'Production Cancel Warning Modal', 'Build queue cancellation confirmation chrome.', 'Fabrication mass reclaimed or lost.', 'mechanical UI necessity'),
  uiAsset('ui-progress-bar-victory', 'ui:progress-bar-victory', 'Victory Progress Bar', 'Victory path completion meter chrome.', 'End-state syntax advancing under audit.', 'mechanical UI necessity'),
  uiAsset('ui-progress-bar-macro-duration', 'ui:progress-bar-macro-duration', 'Macro Duration Progress Bar', 'Active macro duration meter chrome.', 'Partition tool runtime remaining.', 'mechanical UI necessity'),
  uiAsset('ui-status-badge-active-macro', 'ui:status-badge-active-macro', 'Active Macro Badge', 'Indicates macro currently executing.', 'Partition tool live in system.', 'mechanical UI necessity', { visualVariant: 'seal' }),
  uiAsset('ui-status-badge-hazard-sealed', 'ui:status-badge-hazard-sealed', 'Hazard Sealed Badge', 'Indicates hazard seal active.', 'Gravity thread seal stitched locally.', 'mechanical UI necessity', { visualVariant: 'seal' }),
  uiAsset('ui-status-badge-inerted', 'ui:status-badge-inerted', 'Inerted Badge', 'Indicates Syrin inerting active.', 'Containment field holds the bleed.', 'direct canon', { visualVariant: 'inerting' }),
  uiAsset('ui-status-badge-hostile', 'ui:status-badge-hostile', 'Hostile Badge', 'Indicates hostile control or stance.', 'Transit under fire risk.', 'mechanical UI necessity', { visualVariant: 'catastrophic' }),
  uiAsset('ui-empty-state-fleet-manager', 'ui:empty-state-fleet-manager', 'Fleet Manager Empty State', 'Placeholder when no fleets deployed.', 'No groups in operational syntax.', 'mechanical UI necessity'),
  uiAsset('ui-empty-state-macro-intel', 'ui:empty-state-macro-intel', 'Macro Intel Empty State', 'Placeholder when no macro intel available.', 'Partition surface awaiting scan.', 'mechanical UI necessity'),
  uiAsset('ui-empty-state-victory-paths', 'ui:empty-state-victory-paths', 'Victory Paths Empty State', 'Placeholder when no victory routes visible.', 'End-state syntax not yet legible.', 'mechanical UI necessity'),
];