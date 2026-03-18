# Autonomous GPU Pricing Strategy Architecture

This document outlines the core pricing strategy and mathematical hierarchy used by the **GPU Pricing Agent**. The system is designed not as a static calculator, but as a dynamic, context-aware agent that layers strategic business policies on top of deterministic math.

---

## 1. The Two-Layer Architecture

The pricing engine operates in two distinct phases for every incoming lease request:

1.  **The Computation Layer (Deterministic Math)**: A process calculates the theoretical "fair market" base price based strictly on fixed hardware rates and standard discounts (Volume, Duration, Workload type).
2.  **The Agentic Policy Layer (Dynamic Adjustments)**: An LLM-powered agent evaluates the computed quote against live market conditions (Scarcity, Competitor Prices) and executive business rules (Margin Floors). It has the authority to **Override** the math or **Evict** existing customers.

The logic operates within a simulated FastAPI state, isolated per student using a Group-Namespaced Deployment (keyed by `group_id`).

---

## 2. Layer 1: The Base Math Calculation

Before the AI gets involved, the Computation Layer calculates the `Calculated_Base_Quote`. 

### A. Base Rates (Fully Amortized Target Price)
Each GPU has a hardcoded, theoretical target price per hour.
*   **H100**: $3.50/hr
*   **A100**: $2.20/hr
*   **L40S**: $1.20/hr
*   **T4**: $0.40/hr

### B. Standard Discount Modifiers
The system automatically applies stacked discounts:
*   **Volume Discount**: `-5%` (If requesting > 50 units)
*   **Duration Discount**: `-10%` (If requesting > 720 hours / 30 days)
*   **Spot Discount**: `-60%` (If the workload type is "Spot" (interruptible) rather than "On-Demand")

*Constraint:* The absolute maximum combined discount allowed by the math layer is capped at **80%**.

### C. The Base Math Formula
```math
Final Base Price = Base Rate * (1 - Total Combined Discount)
```

---

## 3. Layer 2: The Agentic Policy Governors

Once the `Final Base Price` is calculated, the AI Agent evaluates it against a strict hierarchy of business policies. These policies are governed by configurable "dials" (sliders) managed seamlessly from the React UI dashboard.

### Policy A: Margin Floor Protection (The Absolute Rule)
The Agent must ensure the company never loses money on an operational basis.
*   **Variables**: `depreciation_cost_per_hour`, `power_opex_per_hour`, `min_margin` (Slider)
*   **Logic**: 
    1. Calculate `Total Cost = Depreciation + OPEX`.
    2. Calculate `Target Floor = Total Cost * (1 + min_margin)`.
    3. If the calculated `Final Base Price` is *less* than the `Target Floor`, the Agent will trigger an **OVERRIDE** and raise the price to strictly match the Floor.

### Policy B: Scarcity-Driven Yield Management (Surge Pricing)
The Agent monitors real-time fleet availability across GPU types (H100s, A100s).
*   **Variables**: `scarcity_threshold` (Slider), `scarcity_multiplier` (Slider)
*   **Logic**: If `Available Inventory % < scarcity_threshold`, the Agent will **OVERRIDE** the price, multiplying the `Final Base Price` by the `scarcity_multiplier`. 

### Policy C: Market Competitiveness (The Ceiling)
The Agent ensures surge pricing doesn't reach absurd levels that permanently damage customer trust.
*   **Variables**: `max_market_premium` (Slider), `market_price_per_hour` (Live API)
*   **Logic**: The Agent calculates `Premium Ceiling = Live Market Price * (1 + max_market_premium)`. If the Agent proposes higher, it will **OVERRIDE** and lower the price to exactly match the ceiling. *(Never dropping below the Margin Floor).*

### Policy D: Lifecycle Aggression (Pure Profit Exploitation)
The system tracks the global ROI of the fleet.
*   **Variables**: `cost_recovered` (Boolean), `post_roi_discount_floor` (Slider)
*   **Logic**: If `cost_recovered` is TRUE, the Agent bypasses Policy A for Spot requests and applies ultra-deep discounts to guarantee 100% utilization.

### Policy E: Strategic Preemption (The Eviction Engine)
If the fleet is entirely full, the Agent performs active Opportunity Cost Analysis.
*   **Variables**: `eviction_delta` (Slider)
*   **Logic**: If an On-Demand (premium) request arrives and availability is 0, the Agent scans for active Spot (cheap) instances and triggers an **EVICT** action if `Final Base Price - Market Price >= eviction_delta`.

---

## 4. Summary of Configuration Dials

These core parameters are exposed to the administrative student user via the React Deal Desk UI. Once altered, the frontend immediately POSTs the settings to the FastAPI backend, affecting the very next simulation tick:

| Parameter | Type | Purpose |
| :--- | :--- | :--- |
| `min_margin` | Percentage (%) | The absolute lowest acceptable profit margin over fixed/variable costs. |
| `scarcity_threshold` | Percentage (%) | The inventory level at which surge pricing automatically activates. |
| `scarcity_multiplier` | Float (x) | The severity of the price surge when scarcity triggers. |
| `max_market_premium` | Percentage (%) | The maximum allowable markup over a competitor's live price. |
| `eviction_delta` | Currency ($) | The minimum extra revenue per hour required to justify kicking off an existing customer. |
| `post_roi_discount` | Percentage (%) | The maximum discount allowed on hardware that has already achieved 100% ROI. |
