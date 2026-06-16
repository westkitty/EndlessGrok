# Endless Grok

A playable 4X space strategy game inspired by Endless Space. Explore a procedurally generated galaxy, lead your faction to dominance, and compete against up to 3 AI empires — with premium sci-fi presentation.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

### macOS Dock Launcher

Install a Dock icon that builds (if needed), starts the game server, and opens your browser:

```bash
npm run dock
```

Then drag **Endless Grok** from `~/Applications` into your Dock. Double-click anytime to play. The launcher reuses an already-running server on port 4173.

## New Game Setup

| Option | Choices |
|--------|---------|
| **Faction** | 5 factions with unique emblems and traits (expansionist, scientific, militarist) |
| **Difficulty** | Easy / Normal / Hard |
| **Galaxy Size** | Small (16) / Medium (24) / Large (36) / Huge (48) systems |
| **Galaxy Shape** | Spiral, Cluster, Ring, Elliptical, Sparse (preview text shown) |
| **Empire Count** | 2–4 total empires (you + 1–3 AI) |
| **Max Turns** | Configurable turn limit |
| **Seed** | Optional deterministic galaxy |

### Save & Load

- **Autosave** every 5 turns (indicator in HUD)
- **Load Game** modal lists all save slots with metadata (faction, turn, size)
- **New Game** confirmation before overwriting autosave
- **Export** current game as JSON from in-game menu
- **Import Save** from JSON file on main menu
- Corrupt saves show a recovery message instead of crashing

## Controls

| Key | Action |
|-----|--------|
| `E` | End turn |
| `1–5` | Switch tabs (System, Empire, Fleets, Research, Diplomacy) |
| `Esc` | Deselect / pause menu |
| `?` | Keyboard shortcuts overlay |
| `R` | Reset galaxy map zoom |
| Scroll | Zoom galaxy map |
| Drag | Pan galaxy map |

## Core Loop

1. **Explore** — Move scout fleets; multi-hop paths supported (click destination, fleet travels over turns)
2. **Anomalies** — Explore wormholes (teleport), ruins, caches for rewards
3. **Colonize** — Claim planets (costs influence + resources)
4. **Specialize** — Set planet focus: balanced, food, industry, or science
5. **Build** — Farms, factories, labs, spaceports, markets, academies, fortresses, orbital stations
6. **Produce** — Queue ships at spaceports (dreadnoughts, carriers, destroyers, etc.)
7. **Research** — 22+ tech tree; second research slot with Advanced Manufacturing
8. **Diplomacy** — Neutral → Trade Pact → NAP → Hostile → War
9. **Combat** — Fleets fight on contact; winners can capture undefended planets
10. **Siege** — Blockade enemy systems to reduce their output
11. **End Turn** — Review turn summary modal with deltas

## Play Guide

### First 10 Turns
1. Select your faction trait and galaxy options; optional seed for reproducible maps.
2. Open the **System** tab — review your homeworld, build a farm or factory, queue a scout.
3. Move your scout fleet to an adjacent system (multi-hop: click destination, fleet travels over turns).
4. Explore anomalies when present — precursor sites grant science, influence, and lore popups.
5. Colonize a nearby habitable planet when you have enough influence and resources.
6. End turn (`E`) and read the turn summary for income/expense breakdown.

### Mid Game (Turns 10–50)
- Set **planet specialization** (food/industry/science) and upgrade colony development.
- Clear **blockers** on planets when you can afford the cost.
- Propose **trade pacts** in the Diplomacy tab; trade routes appear as gold dashed lines on the map.
- Watch for **pirate fleets** (skull markers) after turn 30.
- Research military techs before declaring war; use **combat prediction** when targeting enemy fleets.
- Check **Empire** tab for fleet upkeep, veteran badges, and economy bar chart.

### Late Game (Turns 50+)
- A galactic **crisis** warning fires at turn 80 — prepare militarily and economically.
- Pursue your victory condition (domination, science, influence, or survival).
- Use diplomacy negotiation: demand peace or tribute during wars; monitor war score.
- Three named **galaxy mysteries** are seeded each game — find and explore them for lore.

## Architecture

```
src/
├── game/           # Pure game logic (no React)
│   ├── game.ts     # createNewGame, endTurn, serialize/deserialize
│   ├── actions.ts  # Player actions (colonize, build, move, diplomacy)
│   ├── ai.ts       # AI economy, research, combat, expansion
│   ├── combat.ts   # Battle resolution, predictions
│   ├── diplomacy.ts# Relations, trade, war score, border tension
│   ├── economy.ts  # Resource generation, deficits
│   ├── galaxy.ts   # Procedural galaxy generation (shapes, sizes)
│   ├── save.ts     # Multi-slot saves, export/import JSON
│   ├── pirates.ts  # Freebooter Cartel spawn
│   ├── mysteries.ts# Three named precursor sites per galaxy
│   ├── crisis.ts   # Turn-80 empire-wide crisis
│   └── __tests__/  # Vitest suites (game, loops101-150, loops201-250, loops251-300)
├── components/     # React UI panels and overlays
│   ├── GalaxyMap.tsx      # Canvas map (trade routes, pirate skulls)
│   ├── SystemPanel.tsx    # Planet/build/fleet/blocker UI
│   ├── EmpirePanel.tsx    # Economy breakdown, fleets, leaderboard
│   ├── DiplomacyPanel.tsx # Relations, war score, negotiation
│   ├── BattleReportPanel.tsx # Combat history + replay phases
│   └── App.tsx            # Menu, HUD, save/load wiring
└── assets/         # SVG icons + procedural galaxy graphics
```

Turn resolution order is defined in `endTurn()` (`game.ts`): economy → upkeep → production → research → siege → events → crisis → pirates → AI → diplomacy → movement → combat → victory check.

## Victory Conditions

| Type | Requirement |
|------|-------------|
| **Domination** | Control 60% of colonizable planets |
| **Science** | Quantum Computing + 16 total technologies |
| **Influence** | Sustain 80 influence for 5 consecutive turns |
| **Survival** | Most planets when turn limit reached |

Progress bars shown in HUD.

## Resources

- **Credits, Food, Industry, Science** — standard economy
- **Influence** — colonization, buildings, influence victory
- **Strategic** — Titanium, Antimatter, Dark Matter (rare planet resources)

## Loops 301-400

Multi-turn colonization projects, player decision events (frontier surveys), AI chokepoint defense and science victory pursuit, war declaration influence cost, border friction scores, system defense ratings, turn summary colonization/research counts, and grouped turn notifications.

## Features (300 enhancement loops)

- Multi-empire galaxy with AI vs AI diplomacy, difficulty modifiers (no free AI resources)
- Galaxy shapes + huge 48-system maps, three named mystery sites per game
- Save slots, autosave, JSON export/import, corrupt-save recovery
- Fleet upkeep, veteran badges, combat prediction, battle replay history
- Trade route map lines, pirate skull fleet markers, relation score bars
- Late-game crisis at turn 80, precursor lore popups, event chain progress
- Colony development, terraforming UI, blocker clearing, system specialization
- 38+ SVG icons, procedural nebulae, spectral star rendering

## Development

```bash
npm run dev       # Dev server
npm run build     # Production build
npm test          # 122 tests (deterministic sim, save round-trip, strategic resources)
npm run test:e2e  # Playwright smoke test (boot, end turn, fleet manager)
```

## Documentation

- [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md) — All 300 enhancement loops
- [ASSET_MANIFEST.md](ASSET_MANIFEST.md) — Visual asset inventory
- [STYLE_GUIDE.md](STYLE_GUIDE.md) — Art direction and design tokens

## Playability & Bug Sweep

See [BUG_SWEEP_REPORT.md](BUG_SWEEP_REPORT.md) for the latest audit.

**Status:** Playable end-to-end (new game → explore → colonize → research → combat → win/loss).

```bash
npm test    # 98 tests including full playthrough simulation
```

## Known Issues

- Audio not implemented (settings toggle is placeholder)
- Some seeds end quickly via early domination victory
- Turn summary modal requires dismiss each turn
- Artificial planet icon exists; gameplay not yet added
- Desktop-first layout; mobile usable but not optimized
- Games can end before turn 50 on some seeds (domination victory)
- Pirate spawn requires at least one non-black-hole system (fallback if all planets colonized)