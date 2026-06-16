# Endless Grok — Visual Style Guide

Premium sci-fi 4X aesthetic inspired by the feel of space strategy games. All art is original — procedural canvas and SVG only.

## Design Philosophy

- **Depth through layers** — starfield, nebula, fog, systems, UI stack in z-order
- **Luminous glass** — panels use translucent backgrounds with blur and subtle borders
- **Information glow** — interactive and owned elements emit soft colored light
- **Restrained motion** — slow pulses, trail animations, hover transitions

## Color System

Defined in `src/styles/tokens.css`.

### Void & Surfaces
- `--void-deep` (#04060c) — deepest space background
- `--panel-bg` — glass panel fill (72% opacity)
- `--glass-border` — default luminous edge

### Accents
- **Cyan** (`--accent-cyan`) — selection, active tabs, turn counter
- **Blue** (`--accent-blue`) — primary actions, science, links
- **Violet** (`--accent-violet`) — menu title gradient end
- **Gold** (`--accent-gold`) — credits, victory, capital crown

### Semantic
- Success: `#3ee88a` — colonization, researched tech, trade/pact
- Warning: `#ffb84a` — active research, contested systems
- Danger: `#ff5a6a` — combat, war, defeat, siege rings

### Factions
| Faction | Token |
|---------|-------|
| Terran Federation | `--faction-terran` |
| Crimson Hegemony | `--faction-crimson` |
| Verdant Collective | `--faction-verdant` |
| Solar Dominion | `--faction-solar` |
| Void Ascendancy | `--faction-void` |

## Typography

| Role | Font | Usage |
|------|------|-------|
| Display | Orbitron | Titles, section headers, turn counter |
| Body | Exo 2 | Buttons, descriptions, panel text |
| Mono | JetBrains Mono | Resource values, event log, costs |

## Components (Loops 151–200)

### Galaxy Map (`GalaxyMap.tsx`)
- Mouse wheel zoom (0.5×–3×), drag to pan
- Minimap bottom-left with viewport rect, click-to-navigate
- Sector labels: Alpha / Beta / Gamma / Delta
- 3 nebula color schemes by seed region
- Star lens flare on hover/selection
- Colonized planet ring halos
- Fleet destination: dashed glowing cyan path
- Siege: pulsing red ring; contested: amber dashed ring
- Capital: gold crown marker
- Black hole: dark sphere + accretion disk
- Wormhole anomaly: swirling portal icon
- `SystemTooltip` on hover

### HUD
- `ResourceBar` with formula hint tooltips
- `VictoryProgress` compact bars under turn counter
- Faction emblem + empire name with player color
- Hotkey hints on End Turn and tab buttons

### Overlays
- `CombatOverlay` — red flash on battle
- `TurnSummaryModal` — post-turn deltas
- `PauseMenuOverlay` — Escape / Menu button
- `KeyboardShortcutsOverlay` — ? key
- `SettingsModal` — animation toggle, UI scale (0.9/1/1.1), scanlines, sound placeholder
- `LoadingScreen` — fade transition on new game

### Panels
- `SystemOrbitalView` — animated planet orbits in system header
- `ProductionOverview` — empire-wide queue in Empire tab
- `BattleReportPanel` — attacker/defender power bars
- Diplomacy timeline + trade/pact badge styling
- Empire leaderboard styled cards
- Side panel accent border matches player faction color (`--player-faction-color`)
- Staggered panel entrance animations

### Menu
- `StarfieldBackground` animated nebula + stars
- Faction selection cards with emblems and trait descriptions

### Settings (`uiSettings.ts`)
- Persisted to localStorage
- `animationsEnabled`, `uiScale`, `scanlinesEnabled`, `soundEnabled` (disabled placeholder)

## Galaxy Map Visual Language

| Element | Treatment |
|---------|-----------|
| Unknown systems | Hidden |
| Scouted (not visible) | Gray node |
| Visible systems | Spectral-class star glow |
| Owned systems | Faction-colored fill + ring halo |
| Contested | Animated dashed amber ring |
| Siege | Pulsing red ring |
| Jump lanes | Glowing cyan when both endpoints visible |
| Fleet movement | Animated dashed trail |
| Hover | Floating glass tooltip |

## Icons

- 24×24 viewBox SVGs
- Stroke + fill with token colors
- Used at 12–36px via `<Icon />` component
- Registry: `src/components/icons/Icon.tsx`

## Animation Guidelines

| Animation | Duration | Easing |
|-----------|----------|--------|
| Hover transitions | 120–220ms | ease-out |
| Panel/tab states | 220ms | ease-out |
| Notifications slide-in | 400ms | spring |
| Combat flash | 600ms | ease-out |
| Star/nebula pulse | 3–5s | sine (infinite) |
| Fleet trails | animated dash offset | linear |

Disable all via Settings → Animations (`app--no-anim`).

## Accessibility

- `:focus-visible` outlines on buttons, tabs, inputs
- Tooltips support hover and focus
- Canvas map supplemented with `SystemTooltip` text
- Sufficient contrast on primary text (#e8f0fa on #0a0e17)

## File Reference

- Tokens: `src/styles/tokens.css`
- Global UI: `src/App.css`
- Assets: `ASSET_MANIFEST.md`
- Icon API: `src/components/icons/Icon.tsx`
- Map helpers: `src/components/galaxy/mapHelpers.ts`
- Galaxy rendering: `src/assets/galaxy/nebula-procedural.ts`
- UI settings: `src/game/uiSettings.ts`