# Resource Model — UI Consumption

## Tooltip contract

Resources display through `ResourceBar` using registry keys `resource:{key}`.

| Key | Mechanical | Lore (short) |
|-----|------------|--------------|
| `starsilkThread` | Macro / Starbinding fuel | Dangerous filament — not fuel |
| `inertStarsilk` | Seals, containment victory | Muted strand — safer, not innocent |
| `syrinReagent` | Inerting mist, arrays | Containment chemistry |
| `archiveData` | Audits, scrubs, extraction | Stellar records — not soul currency |
| `bloodRingGlass` | Drakken biosphere macros | Morally contaminated material |
| `siegeLatticeFragment` | Lattice anchors near singularities | Containment shard — hazard remains |

Standard resources (`credits`, `food`, `industry`, `science`, `influence`, strategic minerals) use integrated icons from `iconHelpers.ts`.

## Income / breakdown

`ResourceBar` passes runtime tooltip context:

- per-turn income, expenses, net (core resources)
- strategic income note from colonies
- Starsilk income from deposits/archives

Mechanics appear **before** lore in `StarsilkTooltipContent`.

## Testing

- `data-testid="resource-item-{key}"` on each resource chip
- `data-testid="resource-starsilk-thread"` etc. on asset icons via registry `testId`

## Upstream

Full resource writing rules live in the external asset-agent package stubs. Do not duplicate here.