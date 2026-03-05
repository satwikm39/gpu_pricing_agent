# Objective: Architecture and implementation strategy for a policy-driven Agentic AI pricing system designed to maximize GPU leasing revenue.

## 1. Executive Summary
The objective of this system is to maximize Total Revenue Earned per GPU across its lifecycle. To achieve this, we are separating the raw mathematical pricing calculations from the business logic. 

This design introduces a Policy-Enforcing Agent that sits on top of the deterministic computation engine. The agent evaluates the computed price against real-time fleet health, demand constraints, and financial targets. **Crucially, the Agent acts as the "Glass-Box" communicator, using Generative AI to provide explainable reasoning for its financial decisions (e.g., why a surge was applied or an instance evicted).** This architecture provides an interactive environment for students in the hackathon to manipulate policy weights, run simulations against the dataset, and observe how different governance rules impact overall revenue and customer trust.

## 2. System Architecture
The architecture is divided into three distinct layers:
* **The Computation Layer (The Calculator)**: Processes the base math based on input dimensions (Duration, Utilization Rate, Region, Time of Day). It outputs a Proposed Quote.
* **The Agentic Policy Layer (The Governor & Explainer)**: An autonomous AI agent that intercepts the Proposed Quote. It evaluates current market conditions and internal financial rules to Approve, Reject, or Override the quote to maximize yield. **It then uses an LLM to generate a natural language explanation defending its choice to the end-user.**
* **The Simulation UI (The Student Sandbox)**: The interface where students adjust the agent's policy thresholds and test their strategies against historical or simulated transaction data.

## 3. The Agentic Policy Layer (Core Rules)
The agent does not calculate the base price; it enforces the policies that guarantee profitability and explains those actions to the user. Students will be able to play around with the "thresholds" (variables) in these policies to see how aggressive or conservative pricing impacts the bottom line.

### Policy A: Margin Floor Protection (The Absolute Minimum)
To prevent the computation layer from applying too many concurrent discounts (e.g., an off-peak discount stacked with a low-utilization discount), the agent enforces a hard financial floor.
* **Agent Logic**: `IF Proposed_Quote < (Depreciation_Cost + Power_OPEX + Minimum_Margin), THEN Override = Floor_Price`
* **Student Variable**: Students can adjust the Minimum_Margin percentage. Setting it too high may result in idle GPUs; setting it too low risks negative revenue.

### Policy B: Scarcity-Driven Yield Management
The agent monitors real-time global inventory. If supply drops to critical levels, the agent overrides standard regional or time-based multipliers with an aggressive scarcity premium, similar to AWS's algorithmic trend models.
* **Agent Logic**: `IF Available_H100_Inventory < Scarcity_Threshold, THEN Final_Quote = Proposed_Quote * Scarcity_Multiplier`
* **Student Variables**: Students define the Scarcity_Threshold (e.g., < 10% fleet availability) and the Scarcity_Multiplier (e.g., 2.5x).

### Policy C: Strategic Preemption (Eviction Logic)
To maximize revenue, the agent must constantly evaluate the opportunity cost of running discounted "Spot" workloads. If a full-paying on-demand customer requests a GPU that is currently running a cheap spot workload, the agent initiates an eviction.
* **Agent Logic**: `IF (On_Demand_Bid - Current_Spot_Rate) > Eviction_Delta, THEN Trigger_Eviction(30_second_warning) AND Explain(Reason)`
* **Industry Standard Alignment & Glass-Box Transparency**: The agent will utilize a 30-second ACPI G2 "Soft Off" signal to ensure users can checkpoint their work. **Crucially, the Agent adheres to Glass-Box Transparency by generating a Semantic Notice to the evicted user (e.g., "Instance reclaimed due to high-priority On-Demand request"), rather than a silent failure.**
* **Student Variable**: Students tune the Eviction_Delta. A low delta causes high customer churn (frequent evictions), while a high delta leaves money on the table.

### Policy D: Lifecycle Aggression (Cost Recovery)
The agent tracks the financial history of the specific hardware unit, calculating its Return on Investment (ROI) over its lifecycle.
* **Agent Logic**: `IF GPU.Cost_Recovered == TRUE, THEN bypass Policy A (Margin Floor) AND approve deep Spot discounts to ensure 100% utilization.`
* **Student Variable**: Students test how quickly they can achieve hardware ROI by aggressively discounting older hardware.

### Policy E: Market Competitiveness
The agent actively monitors external competitor pricing (Live Market Pulse) and acts autonomously to win deals that would otherwise be rejected by the base math, without violating the margin floor.
* **Agent Logic**: `IF Proposed_Quote > (Competitor_Market_Price * (1 + Max_Market_Premium)), THEN Override = Competitor_Market_Price * (1 + Max_Market_Premium)` (provided it stays above Margin Floor).
* **Student Variable**: Students define the `Max_Market_Premium` (e.g. 20%) to dictate how aggressively the agent will price-match the competition.

## 4. Student Simulation Workflow
To make this an effective learning and testing environment, students will follow a continuous feedback loop:
1. **Configure the Environment**: Students select the Target GPU Architecture (H100, A100, L40S) and configure underlying Fleet costs (Depreciation and Power Opex).
2. **Configure the Agent**: Students set the parameters for Policies A through E via the Policy Sandbox.
3. **Run Simulation**: The agent processes stochastic mock requests generated by the Chaos Monkey simulator.
4. **Evaluate Deal Desk Output**: The system outputs a visual dashboard showing:
    * Total Revenue Generated
    * Fleet Availability & Active Spot Overviews
    * Number of Evictions Triggered vs. Deals Rejected
    * **Customer Trust Score / SLA Penalty (Decreases when evictions are too aggressive)**
    * **Hardware ROI Tracking (Time-to-recovery metrics across the GPU lifecycle)**
    * **Live Deal Feed & Receipt**: A granular Glass-Box receipt detailing absolute hardware costs, base rates, discount subtractions, Live Market Pulse, and the Agent's final natural language explanation.
5. **Iterate**: Students adjust the policies to find the optimal balance between 100% utilization, maximum margin per hour, and long-term customer trust.
