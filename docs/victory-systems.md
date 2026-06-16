# Victory Systems

Victory UI must show warnings, consequences, progress, and irreversible-state language.

## Starbinding

Catastrophic, morally compromised, irreversible-state path. Never frame as a clean good ending.

| Asset ID | Filename | Status | Test ID |
|---|---|---|---|
| victory-starbinding | public/assets/icons/victory/victory-starbinding.svg | prompted | victory-starbinding |
| victory-starbinding-stage-forbidden-theory | public/assets/icons/victory/victory-starbinding-stage-forbidden-theory.svg | prompted | victory-starbinding-stage-forbidden-theory |
| victory-starbinding-stage-partition-mathematics | public/assets/icons/victory/victory-starbinding-stage-partition-mathematics.svg | prompted | victory-starbinding-stage-partition-mathematics |
| victory-starbinding-stage-syrin-inerting-method | public/assets/icons/victory/victory-starbinding-stage-syrin-inerting-method.svg | prompted | victory-starbinding-stage-syrin-inerting-method |
| victory-starbinding-stage-worldsvault-array | public/assets/icons/victory/victory-starbinding-stage-worldsvault-array.svg | prompted | victory-starbinding-stage-worldsvault-array |
| victory-starbinding-stage-target-selection | public/assets/icons/victory/victory-starbinding-stage-target-selection.svg | prompted | victory-starbinding-stage-target-selection |
| victory-starbinding-stage-heliocide-sequence | public/assets/icons/victory/victory-starbinding-stage-heliocide-sequence.svg | prompted | victory-starbinding-stage-heliocide-sequence |
| victory-starbinding-stage-diplomatic-crisis | public/assets/icons/victory/victory-starbinding-stage-diplomatic-crisis.svg | prompted | victory-starbinding-stage-diplomatic-crisis |
| victory-starbinding-stage-final-macro-execution | public/assets/icons/victory/victory-starbinding-stage-final-macro-execution.svg | prompted | victory-starbinding-stage-final-macro-execution |
| victory-starbinding-target-marker | public/assets/icons/victory/victory-starbinding-target-marker.svg | prompted | victory-starbinding-target-marker |
| victory-rival-starbinding-warning | public/assets/icons/victory/victory-rival-starbinding-warning.svg | prompted | victory-rival-starbinding-warning |
| victory-catastrophic-final-modal | public/assets/icons/victory/victory-catastrophic-final-modal.svg | prompted | victory-catastrophic-final-modal |
| victory-syrin-inerting | public/assets/icons/victory/victory-syrin-inerting.svg | prompted | victory-syrin-inerting |
| victory-ledger-dominion | public/assets/icons/victory/victory-ledger-dominion.svg | prompted | victory-ledger-dominion |
| victory-blood-eclipse | public/assets/icons/victory/victory-blood-eclipse.svg | prompted | victory-blood-eclipse |
| victory-archive-continuity | public/assets/icons/victory/victory-archive-continuity.svg | prompted | victory-archive-continuity |

## Other Victory Paths

- Syrin Inerting: preservation and containment; stabilized, not purified.
- Ledger Dominion: administrative containment/control.
- Blood Eclipse: Drakken overwrite path; no dragons or conquest glamour.
- Archive Continuity: research/memory custody; preservation remains morally ambiguous.

## UI consumption

| Path | Key | Status in game |
|------|-----|----------------|
| Starbinding | `victory:starbinding` | Completable — catastrophic |
| Syrin Inerting | `victory:syrinInerting` | Completable |
| Ledger Dominion | `victory:ledgerDominion` | Foundation only |
| Blood Eclipse | `victory:bloodEclipse` | Foundation only |
| Archive Continuity | `victory:archiveContinuity` | Foundation only |

`VictoryPanel` uses `AssetIcon` + registry lookup. Starbinding tooltips must surface irreversible, heliocide-linked warnings. E2E: `e2e/victory-hazard.spec.ts`, `e2e/starbinding.spec.ts`.
