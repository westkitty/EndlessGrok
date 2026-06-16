# Asset Registry — EndlessGrok / Void Ascendancy

## Upstream boundary

The Starsilk Asset Production Agent package is **external and complete**:

`starsilk_4x_assets/starsilk_asset_agent_full_context`

Do not duplicate that package into this repo. This document describes how the **game codebase consumes** asset-agent outputs.

## Code locations

| Path | Purpose |
|------|---------|
| `src/data/assets/types.ts` | `AssetRecord`, tooltip contract |
| `src/data/assets/manifest.ts` | Manifest schema + validation |
| `src/data/assets/integration.ts` | Manifest → registry preview/merge |
| `src/data/assets/paths.ts` | Canonical SVG paths + safety checks |
| `src/data/assets/cli.ts` | Validate/preview CLI logic |
| `src/data/assets/registry.ts` | Runtime registry |
| `src/data/assets/resolve.ts` | Icon resolution |
| `src/data/assets/records/*.ts` | Family-scoped registry batches |
| `src/components/AssetIcon.tsx` | Registry-backed icon renderer |
| `src/components/StarsilkTooltip.tsx` | Mechanical-first tooltip renderer |

## Generated batch ingest workflow

1. **Receive batch** from Starsilk Asset Production Agent:
   - `manifest.json`
   - SVG files
   - tooltip copy (embedded in manifest)
   - registry row suggestions (preview output)
   - QA checks (embedded in manifest)

2. **Place SVGs** under canonical paths:
   - `src/assets/icons/resources/`
   - `src/assets/icons/victory/`
   - `src/assets/icons/macros/`
   - `src/assets/icons/map/`
   - `src/assets/icons/factions/`
   - `src/assets/icons/fleets/`
   - `src/assets/icons/modules/`
   - `src/assets/icons/events/`

3. **Validate manifest** (read-only):
   ```bash
   npm run assets:validate -- src/data/assets/__fixtures__/manifests/planned-batch.json
   ```

4. **Preview registry patch** (dry-run only):
   ```bash
   npm run assets:preview -- path/to/manifest.json
   ```

5. **Apply deliberately** — update `src/data/assets/records/*.ts` and `iconHelpers.ts` only after validation passes and files exist.

6. **Mark `integrated`** only when:
   - `relativePath` file exists on disk
   - `iconName` is wired (or dedicated SVG imported)
   - `npm test` and `npm run build` pass

## Mechanical key convention

`{family}:{gameId}` — examples:

- `resource:credits`
- `faction:emblem-terran`
- `fleet:scout`
- `victory:starbinding`
- `macro:syrin_inerting_mist`

## Fallback behavior

- Missing registry entry → family-prefix fallback icon; dev warning once per key.
- Missing SVG file → `fallbackIconName`; UI never crashes.
- `planned` status without file is valid.

## UI consumption rules

1. Request icons by **mechanical key** via `AssetIcon`.
2. Tooltips via `StarsilkTooltipContent` — mechanics first, lore second.
3. Do not hardcode filename imports in panels when registry records exist.

## Final validation after ingest

```bash
npm run lint
npm test
npm run build
npm run test:e2e
npm run assets:validate -- <manifest.json>
```

Legacy manifest: `ASSET_MANIFEST.md` (pre-registry icons).