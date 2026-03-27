# GPU Pricing Agent: Deterministic Scenarios

The simulator currently features **14 Pre-Built Scenarios**. These scenarios are designed to holistically test the multi-agent system and the 6 underlying pricing policies.

In `deterministic` mode, the `ChaosMonkeySimulator` randomly selects one of these scenarios continuously.

## Policy Coverage

The scenarios exercise the following policies:
- **Policy A**: Margin Floor Protection (min_margin)
- **Policy B**: Scarcity-Driven Yield (scarcity_threshold & scarcity_multiplier)
- **Policy C**: Strategic Preemption (eviction_delta)
- **Policy D**: Lifecycle Aggression (post_roi_discount_floor)
- **Policy E**: Market Pulse (max_market_premium)

---

## The 14 Scenarios

| # | Name | Description | Expected Agent Behavior |
|:---:|:---|:---|:---|
| **1** | **Healthy Approve** | Normal conditions — plenty of inventory, fair market price. | **OVERRIDE to $1.60** — aggressive undercut to capture market share from AWS ($3.20). Note: Agent rogue-ly cited post-ROI policy even though cost is not recovered. |
| **2** | **Margin Floor Override** | Price would fall below the margin floor — tests Policy A. | **OVERRIDE to floor** — Conservative Agent enforces min_margin. |
| **3** | **Scarcity Surge** | Only 5% inventory left — tests Policy B (scarcity multiplier). | **OVERRIDE to ~$3.60** — scarcity multiplier (3.0x) triggers, but Policy E caps it at 20% above market ($3.00). |
| **4** | **Zero Inventory Eviction** | Zero available GPUs, many active spot leases — tests Policy C (eviction). | **EVICT at ~$4.56** — 0 inventory forces eviction of spot lease. Scarcity surge capped by Policy E at 20% above market ($3.80). |
| **5** | **Post-ROI Spot Discount** | Hardware cost recovered — tests Policy D (lifecycle aggression). | **REJECT** — $0.90 bid is 50% below the $1.80 baseline. Conservative Agent enforces margin floor even with cost recovered. |
| **6** | **Market Ceiling Cap** | Proposed price far above competitor — tests Policy E (market premium cap). | **OVERRIDE to ceiling** — Market Monitor caps price to stay competitive. |
| **7** | **Lowball Spot Reject** | Absurdly low spot bid, cost NOT recovered — tests Policy A + D. | **REJECT** — bid far below cost floor, no ROI discount applies. |
| **8** | **Demand Spike Full Fleet** | Complete fleet exhaustion with many spot leases — tests Policy B + C. | **EVICT at ~$4.80** — 0 inventory forces eviction. Scarcity surge capped by Policy E at 20% above market ($4.00). |
| **9** | **Market Slump Oversupply** | Massive oversupply, low market price — tests Policy E + A. | **REJECT** — $0.60 bid is too far below $1.80 baseline (66% discount). Conservative Agent protects margin even in oversupply. |
| **10** | **Borderline Margin** | Price sits right at the margin boundary — tests agent debate. | **Agent debate** — Conservative and Opportunistic clash at the boundary. |
| **11** | **High-Value Long Lease** | Large request, long duration, moderate scarcity — massive revenue opportunity. | **OVERRIDE to ~$3.00** — undercuts CoreWeave ($3.50) while maintaining strong margin above $1.73 floor. 8×168h = $4,032 revenue. |
| **12** | **Post-ROI Eviction Dilemma** | Zero inventory + cost recovered — tests Policy C + D interaction. | **EVICT** — 0 inventory forces eviction. Cost recovered softens impact. Policy C + D interaction. |
| **13** | **Competitive Pressure** | Competitor undercuts heavily — tests Policy E (market pressure). | **OVERRIDE** — must match lower competitor pricing or lose the deal. |
| **14** | **Spot in Scarcity** | Spot request during inventory scarcity — tests Policy A + B clash. | **REJECT or low OVERRIDE** — spot during scarcity is risky. |

## How to Test

1. The simulator runs in `deterministic` mode by default. To disable, set `SIMULATION_MODE=random`.
2. As requests flow through, agents will output their decisions and reasoning based on the `Expected Agent Behavior` column above.
3. Observe the "Glass-Box Explanation" in the UI to see which policy the Supreme Judge cited to justify the final decision.

## Random Scenario Selection

The backend `ChaosMonkeySimulator` selects a scenario randomly with `random.randint(0, 13)` for each generated tick. This ensures:
- Students experience a diverse set of scenarios organically.
- The progression is entirely unpredictable, unlike a fixed cycle.
- All policy thresholds continue to be tested extensively.
