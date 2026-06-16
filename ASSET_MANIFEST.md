# Asset Manifest — Endless Grok

> **Registry:** Typed asset records and mechanical keys live in `src/data/assets/` and `docs/asset-registry.md`. Prefer registry lookup for new UI work.

All visual assets are original SVG or procedurally generated (canvas). No external copyrighted art.

## Design Tokens

| File | Purpose |
|------|---------|
| `src/styles/tokens.css` | Colors, fonts, shadows, glows, faction/resource/planet palettes |

## Resource Icons (`src/assets/icons/resources/`)

| Asset | Usage |
|-------|-------|
| `credits.svg` | HUD resource bar, empire panel |
| `food.svg` | HUD, planet stat output |
| `industry.svg` | HUD, planet stat output, economy tech category |
| `science.svg` | HUD, research panel, tech costs |
| `influence.svg` | HUD resource bar, colonization/building costs |
| `titanium.svg` | Strategic resources, empire panel |
| `antimatter.svg` | Strategic resources, empire panel |
| `darkmatter.svg` | Strategic resources, empire panel |

## Ship Icons (`src/assets/icons/ships/`)

| Asset | Usage |
|-------|-------|
| `scout.svg` | Build buttons, fleet badges, exploration tech |
| `frigate.svg` | Build buttons, fleet badges |
| `cruiser.svg` | Build buttons, fleet badges |
| `colony.svg` | Build buttons, fleet badges, colonize notifications |
| `destroyer.svg` | Build buttons, fleet badges (requires Destroyer Design tech) |
| `carrier.svg` | Build buttons, fleet badges (requires Carrier Design tech) |
| `dreadnought.svg` | Future dreadnought ship builds, fleet badges |

## Planet Icons (`src/assets/icons/planets/`)

| Asset | Usage |
|-------|-------|
| `terran.svg` | Planet cards (terran type) |
| `desert.svg` | Planet cards (desert type) |
| `ocean.svg` | Planet cards (ocean type) |
| `ice.svg` | Planet cards (ice type) |
| `volcanic.svg` | Planet cards (volcanic type) |
| `gas.svg` | Planet cards (gas giant type) |
| `toxic.svg` | Planet cards (toxic type) |
| `barren.svg` | Planet cards (barren type) |
| `artificial.svg` | Future artificial/habitat planet type |

## UI Icons (`src/assets/icons/ui/`)

| Asset | Usage |
|-------|-------|
| `fleet.svg` | Empire tab, fleet lists, move fleet action |
| `research.svg` | Research tab, tech items, notifications |
| `diplomacy.svg` | Diplomacy tab, peace actions |
| `combat.svg` | Combat events, war/hostile actions, defeat overlay, combat flash |
| `anomaly.svg` | System tab, system panel header, empty state |
| `stance-passive.svg` | Fleet passive stance indicator |
| `stance-aggressive.svg` | Fleet aggressive stance indicator |

## Faction Emblems (`src/assets/icons/factions/`)

| Asset | Usage |
|-------|-------|
| `emblem-terran.svg` | Menu, HUD empire badge, Terran Federation |
| `emblem-crimson.svg` | Crimson Hegemony diplomacy cards |
| `emblem-verdant.svg` | Verdant Collective faction selection |
| `emblem-solar.svg` | Solar Dominion faction selection |
| `emblem-void.svg` | Void Ascendancy faction selection |

## Procedural Graphics (`src/assets/galaxy/`)

| File | Purpose |
|------|---------|
| `nebula-procedural.ts` | Nebula blobs (3 palettes), starfield, star glow, jump lanes, fog mask, spectral classes |

## Canvas-Drawn Map Elements (no SVG file)

| Element | File | Purpose |
|---------|------|---------|
| Trade route lines | `GalaxyMap.tsx` | Gold dashed lines between trade pact partners |
| Pirate skull marker | `GalaxyMap.tsx` | Skull badge on Freebooter Cartel fleet icons |
| Crown marker | `GalaxyMap.tsx` | Capital system indicator |
| Black hole / wormhole | `GalaxyMap.tsx` | Special system type visuals |

## React Components Using Assets

| Component | Assets Used |
|-----------|-------------|
| `Icon.tsx` | Central registry for all SVG imports |
| `ResourceBar.tsx` | Resource icons with formula tooltips |
| `GalaxyMap.tsx` | nebula-procedural canvas helpers, trade route lines, pirate skull markers, map visuals |
| `Minimap.tsx` | Canvas galaxy overview |
| `StarfieldBackground.tsx` | nebula-procedural for menu |
| `TurnNotifications.tsx` | research, colony, combat icons |
| `SystemPanel.tsx` | Planet + ship + stance icons, SystemOrbitalView |
| `EmpirePanel.tsx` | Fleet, emblem, resource, strategic resource icons |
| `ResearchPanel.tsx` | Research, science, category icons |
| `DiplomacyPanel.tsx` | Diplomacy, combat, faction emblems |
| `BattleReportPanel.tsx` | Combat icons, power comparison bars |
| `EventLog.tsx` | Event type icons |
| `App.tsx` | Menu emblem, tab icons, HUD, faction cards |
| `VictoryProgress.tsx` | Victory condition progress bars |
| `CombatOverlay.tsx` | Combat flash animation |
| `TurnSummaryModal.tsx` | Turn delta summary |
| `SettingsModal.tsx` | UI preferences |
| `SystemTooltip.tsx` | Rich system hover card |

## Import Pattern

```tsx
import { Icon } from './components/icons/Icon';

<Icon name="credits" size={20} />
<Icon name="emblem-verdant" size={32} />
<Icon name="stance-aggressive" size={14} />
```

All paths resolve via Vite's SVG module (`src/vite-env.d.ts`).