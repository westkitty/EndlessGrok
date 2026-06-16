# Asset Registry — EndlessGrok / Void Ascendancy

## Upstream boundary

The Starsilk Asset Production Agent package is **external and complete**:

`starsilk_4x_assets/starsilk_asset_agent_full_context`

Do not duplicate that package into this repo. This document describes how the **game codebase consumes** asset-agent outputs.

## Code locations

| Path | Purpose |
|------|---------|
| `src/data/assets/types.ts` | `AssetRecord`, tooltip contract, runtime context |
| `src/data/assets/registry.ts` | Load, validate, lookup by id / mechanical key |
| `src/data/assets/resolve.ts` | Icon resolution, test ids, tooltip builders |
| `src/data/assets/records/*.ts` | Family-scoped registry batches |
| `src/components/AssetIcon.tsx` | Registry-backed icon renderer |
| `src/components/StarsilkTooltip.tsx` | Mechanical-first tooltip renderer |

## Mechanical key convention

`{family}:{gameId}` — examples:

- `resource:credits`
- `resource:starsilkThread`
- `victory:starbinding`
- `macro:syrin_inerting_mist`
- `macro-effect:singularitySeal`
- `map:collapsed_black_hole`

## Required asset fields

Every `AssetRecord` must include:

- `id`, `mechanicalKey`, `displayName`, `family`, `status`
- `mechanicalMeaning`, `loreMeaning`, `accessibilityLabel`
- `tooltip.title`, `tooltip.mechanical`, `tooltip.lore`
- `testId`
- `iconName` (integrated) or `fallbackIconName` (planned)

## Lookup API

```typescript
import { getAssetByMechanicalKey, getAssetIconName, buildRuntimeTooltip } from '../data/assets';

const asset = getAssetByMechanicalKey('resource:starsilkThread');
const icon = getAssetIconName('macro:gravity_thread_seal');
const tip = buildRuntimeTooltip('victory:starbinding', { progressPct: 42 });
```

## Fallback behavior

- Missing registry entry → fallback icon by family prefix; dev console warning once per key.
- Missing dedicated SVG → `fallbackIconName` from record, never crash.
- Planned assets remain `status: 'planned'` until files exist and `iconName` is wired.

## UI consumption rules

1. Components request icons by **mechanical key**, not filename.
2. Use `AssetIcon` + `StarsilkTooltipContent` (wrapped in `Tooltip` where hover needed).
3. Do not hardcode per-component icon import maps for registry-covered assets.
4. Attach `data-testid` from `getAssetTestId(mechanicalKey)` or record `testId`.

## Ingesting new asset-agent batches

1. Add records to the appropriate `src/data/assets/records/*.ts` file.
2. Run `npm test -- src/data/assets` to validate schema.
3. Update this doc table row (or run future sync script).
4. Set `status: 'integrated'` only when `src/assets/icons/...` file exists and `iconName` is set.

## Registry snapshot

See `getRegistryStats()` in code. Current families: resources, victory, macros, map.

Legacy human manifest: `ASSET_MANIFEST.md` (pre-registry icons). Prefer this registry for new work.