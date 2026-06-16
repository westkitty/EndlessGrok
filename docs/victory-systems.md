# Victory Systems — UI Consumption

## Registry keys

| Path | Key | Status in game |
|------|-----|----------------|
| Starbinding | `victory:starbinding` | Completable — catastrophic |
| Syrin Inerting | `victory:syrinInerting` | Completable |
| Ledger Dominion | `victory:ledgerDominion` | Foundation only |
| Blood Eclipse | `victory:bloodEclipse` | Foundation only |
| Archive Continuity | `victory:archiveContinuity` | Foundation only |
| Domination | `victory:domination` | Standard |
| Science | `victory:science` | Standard |

## VictoryPanel tooltips

- Icons via `AssetIcon` + registry lookup.
- Starbinding tooltip warning: irreversible, heliocide-linked, morally compromised.
- Foundation paths show `statusLabel: Foundation — not completable` when `completable: false`.

## Badge labels

| Registry status | UI badge |
|-----------------|----------|
| complete + completable | Implemented |
| complete + !completable | Implemented |
| foundation | Foundation |
| locked | Locked |

## Testing

- `victory-path-{id}`, `victory-badge-{id}`, `tooltip-victory:{id}` test ids
- E2E: `e2e/victory-hazard.spec.ts`, `e2e/starbinding.spec.ts`