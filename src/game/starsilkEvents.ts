import type { Empire, GameState, StarsilkResources } from './types';

const FIRST_EVENT_KEYS = [
  'starsilkThread',
  'syrinReagent',
  'bloodRingGlass',
  'archiveData',
] as const;

type FirstEventKey = typeof FIRST_EVENT_KEYS[number];

const FIRST_EVENT_MESSAGES: Record<FirstEventKey, string> = {
  starsilkThread: 'First Starsilk Thread isolated. Reality-code strand logged. Handle with containment protocol.',
  syrinReagent: 'Syrin Reagent catalogued. Inerting chemistry confirmed.',
  bloodRingGlass: 'Blood Ring Glass extracted. Atrocity-linked material filed under infrastructure.',
  archiveData: 'Archive Data recovered. Stellar memory traces indexed.',
};

export function processStarsilkDiscoveryEvents(
  state: GameState,
  empire: Empire,
  gained: StarsilkResources,
): void {
  const flags = empire.starsilkDiscoveryFlags ?? {};
  for (const key of FIRST_EVENT_KEYS) {
    const flagKey = `first_${key}`;
    if (flags[flagKey]) continue;
    if ((gained[key] ?? 0) > 0) {
      flags[flagKey] = true;
      state.events.push({
        turn: state.turn,
        type: 'event',
        message: FIRST_EVENT_MESSAGES[key],
      });
    }
  }
  empire.starsilkDiscoveryFlags = flags;
}

export function emitFirstMacroEvent(state: GameState, empire: Empire, macroName: string): void {
  const flags = empire.starsilkDiscoveryFlags ?? {};
  if (flags.first_macro) return;
  flags.first_macro = true;
  empire.starsilkDiscoveryFlags = flags;
  state.events.push({
    turn: state.turn,
    type: 'macro',
    message: `First macro execution: ${macroName}. The universe accepted the loop.`,
  });
}

export function emitStarbindingStageEvent(
  state: GameState,
  stage: number,
  label: string,
  lastStage: number,
): void {
  if (stage <= lastStage) return;
  state.events.push({
    turn: state.turn,
    type: 'starbinding',
    message: `Starbinding stage ${stage}: ${label}`,
  });
}