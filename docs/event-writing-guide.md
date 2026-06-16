# Event Writing Guide — UI / Asset Consumption

## Separation of concerns

- **Event log text** remains in `src/game/events.ts`, macros, diplomacy, Starbinding modules.
- **Asset registry** supplies icon + tooltip contracts for UI surfaces (resources, macros, victory, map).
- Future **event banks** from the Starsilk Asset Production Agent should map to `family: 'events'` records with mechanical keys `event:{id}`.

## Tooltip vs event log

| Surface | Mechanics first? | Lore? | Warning prominent? |
|---------|------------------|-------|-------------------|
| StarsilkTooltip | Yes | Second | Yes — bordered |
| Event log | Yes | Allowed | Use `type` coloring |

Do not paste long lore into event log entries that already have a tooltip elsewhere.

## Asset-agent ingest (future)

When event banks arrive from upstream batches:

1. Add `AssetRecord` per event template with `mechanicalKey: event:{id}`.
2. Wire triggers in `src/game/events.ts` — do not duplicate prose in components.
3. QA: event message must match `AssetRecord.tooltip.mechanical` intent.

## Upstream reference

`starsilk_4x_assets/starsilk_asset_agent_full_context/05_stubs/docs/event-writing-guide.md`