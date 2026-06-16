# Starsilk Runtime Audit — Phase 1

Audit date: 2026-06-16. Sources: seven docs under `docs/`, `src/data/assets/assets.manifest.json`, `src/data/assets/records/*.ts`, and live game modules under `src/game/`.

## Manifest summary

| Metric | Value |
|--------|-------|
| Total ledger records | 134 |
| Status | All `prompted` |
| Duplicate asset IDs | 0 |
| Duplicate test IDs | 0 |
| Missing accessibility labels | 0 |

### Family distribution

| Family | Count |
|--------|-------|
| resources | 10 |
| victory | 16 |
| map | 18 |
| macros | 10 |
| factions | 12 |
| fleets | 17 |
| events | 12 |
| ui | 27 |
| audio | 12 |
| planets | 0 |

## Findings

### Duplicate asset IDs

None in manifest. The legacy `src/data/assets/records/*.ts` registry uses different ID conventions (`starsilk-thread` vs manifest `resource-starsilk-thread`), creating logical duplicates without ID collision.

### Missing families

- `planets` is declared in `AssetFamily` but has zero manifest rows.
- `modules` is not a family; fleet modules live under `fleets`.

### Inconsistent filenames

- Manifest planned paths use `public/assets/icons/...`.
- Integrated runtime icons use `src/assets/icons/...`.
- Legacy registry IDs omit `resource-` / `victory-` prefixes used by manifest and `data-testid` contract.

All manifest filenames are kebab-case compliant.

### Missing test IDs

None in manifest. Legacy registry covers integrated assets with test IDs.

### Missing accessibility labels

None in manifest. Legacy `AssetRecord` entries include labels.

### Orphaned registry entries

`src/data/assets/records/*.ts` (~70 typed records) are **not** keyed to manifest IDs. They power the live UI for integrated icons (credits, emblems, partial Starsilk resources) but are absent from the 134-row ledger naming scheme.

### Runtime assets not in manifest

Integrated game assets without ledger rows:

- Core economy resources (`credits`, `food`, `industry`, `science`, `influence`, strategic minerals)
- Generic faction emblems (`emblem-terran`, `emblem-crimson`, etc.)
- Standard victory paths (`domination`, `science`)
- Macro effect badge records

These predate the Starsilk production ledger and remain `integrated` / `planned` in the legacy registry.

### Phase 4 resource gaps

Requested runtime resources vs documentation:

| Requested | Manifest / doc coverage |
|-----------|-------------------------|
| Archive Data | `resource-archive-data` in resource-model.md |
| Starsilk Thread | `resource-starsilk-thread` |
| Blood Ring Glass | `resource-blood-ring-glass` |
| Siege Lattice Fragment | `resource-siege-lattice-fragment` |
| Syrin Reagent | `resource-syrin-reagent` |
| Checksum Alloy | **Gap** — no resource row; module `module-defense-checksum-hull` |
| Macro Catalyst | **Gap** — closest: `resource-macro-labor` (production capacity) |
| Obsidian Plate | **Gap** — module `module-defense-obsidian-shell` |
| Cinder Core | **Gap** — module `module-engine-cinderverge-thrusters` |
| Gravity Thread | **Gap** — macro `macro-gravity-thread-seal`, engine module |

Material-adjacent records are derived from manifest fleet/macro entries with game macro lore — not invented placeholders.

### Victory path gaps

| Requested | Coverage |
|-----------|----------|
| Starbinding | 16 victory assets + `src/game/starbinding.ts` stages |
| Archive Continuity | `victory-archive-continuity` + foundation tracking |
| Siege Custody | **Not named in docs** — mapped to containment/siege-lattice foundation path |
| Heliocide | Stage within Starbinding (`victory-starbinding-stage-heliocide-sequence`), not standalone victory |

### Event gaps

12 event asset rows in manifest. No JSON event files on disk. Runtime event records are generated from manifest IDs + event-writing-guide tone rules.

### Status truthfulness

No manifest row may claim `generated-*` or `implemented` until files exist. Current count of on-disk planned assets: 8 (seven docs + manifest JSON).

## Recommended next phase

1. Generate SVG/audio/event JSON from prompted ledger rows.
2. Reconcile legacy `records/*.ts` IDs with manifest `resource-*` / `victory-*` prefixes.
3. Wire `StarsilkAssetRecord` tooltips into `AssetIcon` / `ResourceBar` lookup.
4. Add `planets` rows or remove family from ledger schema.