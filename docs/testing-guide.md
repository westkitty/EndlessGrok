# Testing Guide — Asset / Tooltip System

## Unit tests

```bash
npm test -- src/data/assets
```

| File | Covers |
|------|--------|
| `registry.test.ts` | Schema validation, family counts |
| `resolve.test.ts` | Mechanical lookup, fallbacks, test ids |
| `manifest.test.ts` | Manifest contract validation |
| `paths.test.ts` | Canonical paths + safety |
| `integration.test.ts` | Registry patch preview + conflicts |
| `manifest-cli.test.ts` | Validate/preview CLI |
| `panels.test.tsx` | FleetPanel + AssetIcon render |
| `tooltipFormat.test.tsx` | Formatter + StarsilkTooltip render |
| `mapStateBadges.test.ts` | Map badge helper outputs |

## Asset manifest CLI

```bash
npm run assets:validate -- src/data/assets/__fixtures__/manifests/planned-batch.json
npm run assets:preview -- src/data/assets/__fixtures__/manifests/planned-batch.json
```

Fixtures under `src/data/assets/__fixtures__/manifests/` include valid and invalid batches.

## Testing missing assets

```typescript
import { resetAssetWarnings, getAssetIconName } from '../data/assets/resolve';
resetAssetWarnings();
expect(getAssetIconName('resource:missing')).toBe('research'); // no throw
```

## E2E smoke

```bash
npm run test:e2e
```

Relevant specs:

- `e2e/victory-hazard.spec.ts` — Syrin victory panel, macro intel
- `e2e/ai-macro.spec.ts` — macro execute, active effects
- `e2e/starbinding.spec.ts` — Starbinding UI

## data-testid conventions

- Registry `testId` on `AssetIcon` (`resource-credits`, `macro-icon-{id}`, …)
- Composite tooltips: `tooltip-{mechanicalKey}` with suffixed sections (`-mechanical`, `-warning`, …)
- Resource chips: `resource-item-{key}`

## Validation before merge

```bash
npm run lint && npm test && npm run build && npm run test:e2e
```

## Upstream QA

Asset-agent QA gates live in the external package (`07_validation/qa_gates.md`). Game repo tests validate **consumption**, not SVG generation.