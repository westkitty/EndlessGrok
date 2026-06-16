# Resource Model

Mechanics first, Starsilk meaning second, UI notes third.

| Resource Asset ID | Mechanical Meaning | Starsilk Meaning | UI Notes | Test ID |
|---|---|---|---|---|
| resource-starsilk-thread | Rare strategic resource for high-risk Starsilk systems. | Dangerous systemic filament, not fuel. | Warning-coded ribbon/barcode icon. | resource-starsilk-thread |
| resource-inert-starsilk | Stabilized Starsilk input for safer operations. | Muted sealed strand; stabilized, not purified. | Use sealed/muted visual language. | resource-inert-starsilk |
| resource-syrin-reagent | Inerting and bypass resource. | Containment vapor or droplet, not blood. | Avoid gore/potion cues. | resource-syrin-reagent |
| resource-archive-data | Research and intel resource. | Stellar record or data trace, not soul currency. | Use prism/scan-line motifs. | resource-archive-data |
| resource-blood-ring-glass | Contaminated strategic material. | Atrocity-linked vitrified remnant. | Never present as clean reward. | resource-blood-ring-glass |
| resource-siege-lattice-fragment | Containment/singularity material. | Black-hole lattice shard and infrastructure fragment. | Avoid web/whirlpool shapes. | resource-siege-lattice-fragment |
| resource-macro-labor | Production-loop capacity. | Industrial syntax embedded in macro action-loops. | Gear-code motif. | resource-macro-labor |
| resource-command-legitimacy | Influence and political pressure. | Ledger seal/audit authority. | No crown/hero badge. | resource-command-legitimacy |
| resource-fabrication-mass | Build output and construction mass. | Macro-pressed industrial throughput. | Avoid generic ore. | resource-fabrication-mass |
| resource-research-syntax | Science/research output. | Terminal glyph and archive-prism syntax. | Avoid generic flask/atom. | resource-research-syntax |

## UI consumption

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

Mechanics appear **before** lore in `StarsilkTooltipContent`. Resource chips use `data-testid="resource-item-{key}"`.
