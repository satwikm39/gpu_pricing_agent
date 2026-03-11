# Autonomous GPU Pricing Strategy Architecture

This document outlines the core pricing strategy and mathematical hierarchy used by the **GPU Pricing Agent**. The system is designed not as a static calculator, but as a dynamic, context-aware agent that layers strategic business policies on top of deterministic math.

---

## 1. The Two-Layer Architecture

The pricing engine operates in two distinct phases for every incoming lease request:

1.  **The Computation Layer (Deterministic Math)**: A script (`calculator.py`) calculates the theoretical "fair market" base price based strictly on fixed hardware rates and standard discounts (Volume, Duration, Workload type).
2.  **The Agentic Policy Layer (Dynamic Adjustments)**: An LLM-powered agent (`agent.py`) evaluates the computed quote against live market conditions (Scarcity, Competitor Prices) and executive business rules (Margin Floors). It has the authority to **Override** the math or **Evict** existing customers.

---

## 2. Layer 1: The Base Math Calculation

Before the AI gets involved, the Computation Layer calculates the `Calculated_Base_Quote`. 

### A. Base Rates (Fully Amortized Target Price)
Each GPU has a hardcoded, theoretical target price per hour.
*   **H100**: $3.50/hr
*   **A100**: $2.20/hr
*   **L40S**: $1.20/hr
*   **T4**: $0.40/hr

*(Note: Other GPU types mapped in the simulator use a default 1.0 multiplier if not explicitly listed).*

### B. Standard Discount Modifiers
The system automatically applies stacked discounts based on the characteristics of the incoming `LeaseRequest`. 
*   **Volume Discount**: `-5%` (If requesting > 50 units)
*   **Duration Discount**: `-10%` (If requesting > 720 hours / 30 days)
*   **Spot Discount**: `-60%` (If the workload type is "Spot" (interruptible) rather than "On-Demand")

*Constraint:* The absolute maximum combined discount allowed by the math layer is capped at **80%**.

### C. The Base Math Formula
```math
Final Base Price = Base Rate * (1 - Total Combined Discount)
```

**Example:**
An On-Demand request for 100 H100s for 1 hour.
*   Base Rate: $3.50
*   Volume Discount: 5%
*   `Final Base Price` = $3.50 * 0.95 = **$3.32/hr**

---

## 3. Layer 2: The Agentic Policy Governors

Once the `Final Base Price` is calculated, the AI Agent evaluates it against a strict hierarchy of business policies. These policies are governed by configurable "dials" (sliders) managed by the executive team.

### Policy A: Margin Floor Protection (The Absolute Rule)
The Agent must ensure the company never loses money on an operational basis.
*   **Variables**: `depreciation_cost_per_hour`, `power_opex_per_hour`, `min_margin` (Slider)
*   **Logic**: 
    1. Calculate `Total Cost = Depreciation + OPEX`.
    2. Calculate `Target Floor = Total Cost * (1 + min_margin)`.
    3. If the calculated `Final Base Price` is *less* than the `Target Floor`, the Agent will trigger an **OVERRIDE** and raise the price to strictly match the Floor.
*   **Priority**: This is the highest priority rule. It supersedes competitor price matching.

### Policy B: Scarcity-Driven Yield Management (Surge Pricing)
The Agent monitors real-time fleet availability and automatically engages surge pricing if supply drops.
*   **Variables**: `scarcity_threshold` (Slider), `scarcity_multiplier` (Slider)
*   **Logic**: If `Available Inventory % < scarcity_threshold`, the Agent will **OVERRIDE** the price, multiplying the `Final Base Price` by the `scarcity_multiplier`. 

### Policy C: Market Competitiveness (The Ceiling)
The Agent ensures surge pricing doesn't reach absurd levels that permanently damage customer trust compared to live competitors.
*   **Variables**: `max_market_premium` (Slider), `market_price_per_hour` (Live API)
*   **Logic**: The Agent calculates `Premium Ceiling = Live Market Price * (1 + max_market_premium)`. If the Agent's proposed price is higher than this ceiling, it will **OVERRIDE** and lower the price to exactly match the ceiling. *(Exception: It will never lower it below the Margin Floor established in Policy A).*

### Policy D: Lifecycle Aggression (Pure Profit Exploitation)
The system tracks the global ROI of the fleet. Once a GPU has fully paid off its initial hardware cost, `depreciation_cost` becomes entirely sunk.
*   **Variables**: `cost_recovered` (Boolean), `post_roi_discount_floor` (Slider)
*   **Logic**: If `cost_recovered` is TRUE, the Agent is authorized to bypass Policy A for Spot requests. It will apply ultra-deep discounts (up to the `post_roi_discount_floor`) to ensure the paid-off hardware runs at 100% utilization, as any revenue above pure OPEX is profit.

### Policy E: Strategic Preemption (The Eviction Engine)
If the fleet is entirely full, the Agent performs active Opportunity Cost Analysis.
*   **Variables**: `eviction_delta` (Slider)
*   **Logic**: If an On-Demand (premium) request arrives and availability is 0, the Agent scans for active Spot (cheap) instances. If the new `Final Base Price` minus the current `Market Price` is greater than or equal to the `eviction_delta`, the Agent will trigger an **EVICT** action, kicking the budget customer off the hardware to make room for the premium customer.

---

## 4. Summary of Configuration Dials

When deploying this strategy to a new app, ensure these core parameters are exposed to the administrative user:

| Parameter | Type | Purpose |
| :--- | :--- | :--- |
| `min_margin` | Percentage (%) | The absolute lowest acceptable profit margin over fixed/variable costs. |
| `scarcity_threshold` | Percentage (%) | The inventory level at which surge pricing automatically activates. |
| `scarcity_multiplier` | Float (x) | The severity of the price surge when scarcity triggers. |
| `max_market_premium` | Percentage (%) | The maximum allowable markup over a competitor's live price. |
| `eviction_delta` | Currency ($) | The minimum extra revenue per hour required to justify kicking off an existing customer. |
| `post_roi_discount` | Percentage (%) | The maximum discount allowed on hardware that has already achieved 100% ROI. |
