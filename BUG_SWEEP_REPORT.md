# Bug Sweep Report — Endless Grok

**Date:** 2026-06-15  
**Scope:** Full-game playability audit (start → win/loss)

## Playability Status: **PLAYABLE**

The game can be started, played for 50+ turns, and reaches victory or defeat without crashes. All core loops verified via automated playthrough tests.

---

## Bugs Found & Fixed

| Severity | Bug | Fix |
|----------|-----|-----|
| **High** | Faction starting bonuses always applied from faction 0 — selecting Crimson/Verdant/etc. did not grant correct bonuses | `App.tsx` now passes `factionIndex` to `createNewGame()` |
| **High** | Incomplete state clones on End Turn could corrupt `relationScores`, `turnSummaries`, `activeEventChains` | Centralized `cloneGameState()` in `src/game/clone.ts`; used in App, SystemPanel, EmpirePanel, ResearchPanel |
| **Medium** | Fleet command limit existed in combat module but was not enforced when building ships — unlimited ship spam | `canBuildShip()` now checks `getFleetCommandLimit()` with clear error message |
| **Medium** | UI panels used shallow clones — mutations could leak/shared-reference Sets | Replaced panel-local clones with `cloneGameState()` |
| **Low** | Vitest localStorage warnings in Node test environment | Added `src/test-setup.ts` localStorage mock |

---

## Validation Commands

```bash
npm test          # 83 tests — all pass
npm run build     # TypeScript + Vite production build — pass
```

### Test coverage for playability
- `playthrough.test.ts` — faction bonuses, 30-turn sim, multi-hop travel, save/load, victory by turn 150, fleet merge, command limit
- `game.test.ts` — galaxy gen, turn progression, colonization, research, 50–100 turn stability
- `loops101-150.test.ts` — multi-empire, pathfinding, capture, scoring
- `loops201-250.test.ts` — galaxy shapes, upkeep, diplomacy scores, combat prediction
- `loops251-300.test.ts` — save round-trip, deterministic sim, pirates, crisis

---

## Manual Playthrough Checklist

| Step | Status |
|------|--------|
| Start app (`npm run dev`) | ✅ Builds and serves |
| New game with faction/difficulty/galaxy options | ✅ All selectors wired |
| Generated galaxy visible | ✅ Canvas map + minimap |
| Select systems | ✅ Click + tab switch |
| Inspect planets | ✅ System panel with stats, blockers, queue |
| Move fleet (adjacent + multi-hop) | ✅ Move + Set Destination |
| End turns repeatedly | ✅ Turn summary modal, autosave every 5 |
| Discover systems | ✅ Fog of war + exploration snippets |
| Colonize planet | ✅ Influence + resources or colony ship |
| Build in colony | ✅ Buildings + production queue |
| Choose & complete research | ✅ Tech tree + progress bar |
| Build additional fleet/ships | ✅ Command limit enforced at 6 ships |
| Encounter AI | ✅ 1–3 AI empires expand and compete |
| Combat | ✅ Auto-resolve + battle reports |
| Continue after combat | ✅ No softlock |
| Win or loss | ✅ Domination/science/influence/survival |
| Save/load/export | ✅ Slots, metadata, JSON import |

---

## Remaining Known Issues

| Issue | Impact | Workaround |
|-------|--------|------------|
| Some seeds trigger early AI domination victory (<30 turns) | Game ends quickly on easy difficulty | Use harder AI count, larger galaxy, or different seed |
| Audio toggle is placeholder (disabled) | No sound | N/A |
| Precursor lore modal must be dismissed manually | Blocks view until closed | Click to close |
| Turn summary modal appears every End Turn | Extra click to dismiss | Press Enter or Escape |
| Mobile layout is usable but cramped | Small screens | Desktop recommended |
| Artificial planet type has icon only | No gameplay | N/A |

---

## Next Recommended Fixes

1. Balance early-game AI expansion so games last 30+ turns on Normal more consistently
2. Add "Skip turn summary" option in settings
3. Auto-dismiss precursor lore after 5 seconds (optional)
4. Add inline tutorial for first 3 turns
5. Wire fleet repair button in SystemPanel (logic exists in actions.ts)