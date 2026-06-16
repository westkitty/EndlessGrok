# Event Writing Guide

## Required Fields

- `id`
- `title`
- `body`
- `triggerCondition`
- `affectedScope`
- `mechanicalEffect`
- `severity`
- `sourceLabel`
- `options`
- `testFixture`

## Tone Rules

- Clinical, procedural, mechanically clear.
- Moral weight is allowed; heroic celebration is not.
- Mechanics must be visible before lore flourish.
- No generic sci-fi filler.
- No celebratory language after catastrophic actions.

## Fixture Rules

Deterministic E2E events require a fixed seed or explicit trigger condition, expected option labels, expected mechanical effect, and expected UI badge/tooltip state.

## UI / asset consumption

- Structured event definitions live in `src/data/events/*.json` (category files) and `src/data/events/records.ts`.
- Runtime game events still materialize through `materializeEventLogEntry()` into the `GameEvent` shape used by `EventLog`.
- Asset registry supplies icon + tooltip contracts for UI surfaces via `relatedAssetIds`.
- `StarsilkTooltip` presents mechanics first, lore second, warning third.

## Event JSON schema

Category files: `starbinding.json`, `macros.json`, `resources.json`, `diplomacy.json`, `anomalies.json`, `victory.json`.

Each `EventDefinition` requires:

| Field | Purpose |
|---|---|
| `id` | Stable event ID (`event-victory-heliocide-confirmation`) |
| `title` | Log headline |
| `category` | File grouping (`starbinding`, `macros`, `resources`, etc.) |
| `trigger` | When the event fires |
| `body` | Log body text |
| `choices` | `{ id, label, mechanicalEffect }[]` |
| `effects` | Summary mechanical outcome |
| `severity` | `low` \| `medium` \| `high` \| `critical` |
| `sourceLabel` | Canon basis |
| `mechanicalTags` | Searchable tags |
| `relatedAssetIds` | Canonical asset IDs for icons/tooltips |
| `testId` | Stable `data-testid` |
| `logType` | `GameEvent.type` mapping (`event`, `macro`, `starbinding`, `heliocide`, etc.) |
| `canonSafetyNotes` | Optional QA guardrails |

Loaders: `loadEventDefinitions()`, `getEventDefinitionById()`, `getEventsByCategory()`, `validateEventDefinition()`.

Regenerate category JSON from TypeScript records:

```bash
npm run events:materialize
```

## Event fixture workflow

Deterministic E2E coverage uses:

- `tests/fixtures/events/{category}.json` — category slices
- `tests/fixtures/events/event-{id}.json` — per-event fixtures
- `window.__egSeedEvent(eventId)` — dev/E2E hook in `App.tsx`
- `seedEventDefinitionFixture()` in `src/game/testFixtures.ts`

Playwright specs seed events by ID, then assert `data-testid="event-log-{eventDefinitionId}"` on `EventLog` entries. No random event dependency.
