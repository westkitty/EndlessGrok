# Testing Guide

## E2E Hooks

Every gameplay-facing asset needs a stable `data-testid`. Default to the asset ID.

## Visual QA

- Check visual assets at required sizes on dark background.
- Confirm state is not color-only.
- Confirm silhouettes remain legible in monochrome.
- Confirm forbidden motifs are absent.

## Catastrophe QA

Starbinding, heliocide, collapsed stars, Blood Ring Glass, Siege Lattice fragments, and irreversible victory states must not look triumphant. They must report cost, instability, collapse, containment, or moral contamination.

## Registry Sync QA

Compare docs, manifest, and ledger for asset ID, filename, family, status, source basis, code reference, and test ID. Block release on drift.

## Project test commands

```bash
npm test -- src/data/assets
npm test -- src/data/events
npm run assets:ledger:validate
npm run starsilk:validate
npm run starsilk:fixtures
npm run events:materialize
npm run assets:validate -- src/data/assets/__fixtures__/manifests/planned-batch.json
npm run lint && npm test && npm run build && npm run test:e2e
```

Unit coverage: `registry.test.ts`, `resolve.test.ts`, `manifest.test.ts`, `ledger.test.ts`, `integration.test.ts`, `panels.test.tsx`, `tooltipFormat.test.tsx`, `assetIdReconciliation.test.ts`, `runtimeManifest.test.ts`, `loader.test.ts`.

E2E coverage: `e2e/event-fixtures.spec.ts` (deterministic event seeding), plus gameplay/starbinding/victory specs.

## Asset ID reconciliation tests

`assetIdReconciliation.test.ts` verifies:

- Legacy IDs resolve to canonical manifest IDs
- Registry indexes both alias and canonical lookups
- No duplicate canonical IDs or mechanical keys
- Canonical scheme validation passes for integrated records

## Deterministic event fixture tests

`e2e/event-fixtures.spec.ts` seeds events via `__egSeedEvent` and asserts:

- Starbinding/heliocide warning event renders
- Macro execution event renders
- Victory progress event renders

Fixture JSON imports require `with { type: 'json' }` in E2E specs.

## `data-testid` conventions

- Registry `testId` on `AssetIcon`
- Composite tooltips `tooltip-{mechanicalKey}`
- Resource chips `resource-item-{key}`
- Seeded event log entries `event-log-{eventDefinitionId}`

## Production vs test assets

- Production SVG/audio: `public/assets/icons/`, `public/assets/audio/` (empty until agent generates)
- Test fixture SVGs only: `tests/fixtures/assets/`
- Never mark ledger rows `integrated` until files exist and `starsilk:validate` passes file checks
