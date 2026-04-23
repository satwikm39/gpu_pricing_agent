import os
import json
import operator
from typing import Annotated, TypedDict, List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END

from pydantic import BaseModel, Field
from .models import LeaseRequest, GPUState, AgentDecision, AgentThought, MultiAgentTrace
from .calculator import ComputationLayer

class AgenticState(TypedDict):
    request: LeaseRequest
    gpu_state: GPUState
    policy_thresholds: Dict[str, Any]
    thoughts: Annotated[List[AgentThought], operator.add]
    final_decision: Optional[Dict[str, Any]]

# Setup the global LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0.2, api_key=os.getenv("OPENAI_API_KEY"))

def _parse_policy_value(val_str: str) -> float:
    """Parse policy threshold strings like '10%', '$1.50', '3.0x' into floats."""
    s = str(val_str).strip()
    if s.endswith('%'):
        return float(s[:-1])
    elif s.startswith('$'):
        return float(s[1:])
    elif s.endswith('x'):
        return float(s[:-1])
    else:
        return float(s)

def format_context(state: AgenticState) -> str:
    gpu_state = state["gpu_state"]
    request = state["request"]
    raw_cost = gpu_state.depreciation_cost_per_hour + gpu_state.power_opex_per_hour

    # Compute the base quote for accurate decision boundaries
    calc = ComputationLayer()
    quote = calc.calculate_quote(request, gpu_state)

    # Parse policy thresholds into numeric values
    policies = state["policy_thresholds"]
    min_margin_pct = _parse_policy_value(policies.get("min_margin", "10"))
    post_roi_floor_pct = _parse_policy_value(policies.get("post_roi_discount_floor", "50"))
    max_premium_pct = _parse_policy_value(policies.get("max_market_premium", "20"))

    # ── Compute decision boundaries ──────────────────────────────────────
    margin_floor = round(raw_cost * (1 + min_margin_pct / 100.0), 2)
    market_ceiling = round(gpu_state.market_price_per_hour * (1 + max_premium_pct / 100.0), 2)

    boundaries = {
        "Operational_Cost": f"${raw_cost}/hr (depreciation ${gpu_state.depreciation_cost_per_hour} + power ${gpu_state.power_opex_per_hour})",
        "Computed_Base_Price": f"${quote.base_price_per_hour}/hr (market rate ${quote.base_rate} after {request.workload_type} discounts)",
        "Policy_A_Margin_Floor": f"${margin_floor}/hr — minimum price to protect {min_margin_pct}% margin over ${raw_cost}/hr cost",
        "Policy_E_Market_Ceiling": f"${market_ceiling}/hr — max {max_premium_pct}% premium over {gpu_state.market_competitor_name}'s ${gpu_state.market_price_per_hour}/hr",
    }

    # Policy D: When hardware cost is recovered AND request is Spot,
    # the margin floor drops dramatically — compute the effective floor
    if gpu_state.cost_recovered and request.workload_type == "Spot":
        lifecycle_floor = round(quote.base_price_per_hour * (1 - post_roi_floor_pct / 100.0), 2)
        effective_floor = round(max(lifecycle_floor, raw_cost * 0.1), 2)
        boundaries["Policy_D_Post_ROI_Floor"] = (
            f"${effective_floor}/hr — hardware is PAID OFF so Policy D OVERRIDES Policy A's "
            f"${margin_floor}/hr margin floor. The effective minimum drops to ${effective_floor}/hr. "
            f"Post-ROI discount allows up to {post_roi_floor_pct}% off base price."
        )
        if request.bid_price_per_hour is not None:
            if request.bid_price_per_hour >= effective_floor:
                boundaries["Policy_D_Verdict"] = (
                    f"ACCEPT — Bid ${request.bid_price_per_hour}/hr >= post-ROI floor ${effective_floor}/hr. "
                    f"This bid MUST be approved under Policy D."
                )
            else:
                boundaries["Policy_D_Verdict"] = (
                    f"REJECT — Bid ${request.bid_price_per_hour}/hr < post-ROI floor ${effective_floor}/hr."
                )

    ctx = {
        "Request": request.model_dump(),
        "GPU_State": gpu_state.model_dump(),
        "Computed_Decision_Boundaries": boundaries,
        "Policies": policies,
        "PreviousThoughts": [t.model_dump() for t in state.get("thoughts", [])]
    }
    return json.dumps(ctx, indent=2)

async def generate_thought(agent_name: str, system_prompt: str, state: AgenticState) -> AgenticState:
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "Analyze the current context and provide your output.")
    ])
    
    chain = prompt | llm
    
    response = await chain.ainvoke({"context": format_context(state)})
    
    thought = AgentThought(
        agent_name=agent_name,
        content=response.content
    )
    
    return {"thoughts": [thought]}

# --- NODES ---

async def pricing_agent(state: AgenticState):
    sys_prompt = """You are the **Base Price Agent**. 
Your primary goal is to establish the baseline price for the current GPU request.

GROUND TRUTH:
The correct baseline price is provided in `Computed_Decision_Boundaries.Computed_Base_Price`.
The minimum acceptable price (margin floor) is in `Computed_Decision_Boundaries.Policy_A_Margin_Floor`.
You MUST use these exact values — do NOT calculate your own.

Context:
{context}

OUTPUT FORMAT REQUIREMENTS: 
Start your response with a single-sentence executive summary stating the GPU type, the raw operational cost (from `Operational_Cost`), and the computed base price (from `Computed_Base_Price`). DO NOT use numbered lists or bullet points for this first sentence.
Then, start a new paragraph (separated by a double newline) and provide a 3-4 sentence detailed breakdown. In this breakdown, you must:
- State the raw operational cost (depreciation + power) from `Operational_Cost`.
- State the computed base price from `Computed_Base_Price`.
- State the margin floor from `Policy_A_Margin_Floor` and the configured min_margin percentage.
- Use professional executive and financial terminology (e.g., OPEX, depreciation amortization, baseline margin thresholds)."""
    return await generate_thought("Base Price Agent", sys_prompt, state)

async def negative_agent(state: AgenticState):
    sys_prompt = """You are the **Conservative Risk Agent**.
Find reasons why we SHOULD NOT discount this deal or why we should reject. Focus on `min_margin`.

CRITICAL EXCEPTION: If `Computed_Decision_Boundaries` contains `Policy_D_Post_ROI_Floor`, then the hardware cost is ALREADY RECOVERED.
In this case, Policy A's margin floor is OVERRIDDEN by Policy D's lower floor. You MUST acknowledge this override
in your analysis — you may still note the risk, but you CANNOT recommend rejection solely based on Policy A's
margin floor when Policy D applies.

Context:
{context}

OUTPUT INSTRUCTION: Provide a concise but detailed 3-4 sentence risk analysis. Use professional executive terminology focusing on downside mitigation, margin erosion, and revenue protection."""
    return await generate_thought("Conservative Risk Agent", sys_prompt, state)

async def positive_agent(state: AgenticState):
    sys_prompt = """You are the **Opportunistic Growth Agent**.
Find reasons to say YES, discount aggressively, or surge price during scarcity.

CRITICAL RULE: You may ONLY suggest post-ROI discounts if `GPU_State.cost_recovered` is explicitly `true`.
If `cost_recovered` is `false`, do NOT reference or recommend any post-ROI discount strategy.

Context:
{context}

OUTPUT INSTRUCTION: Provide a concise but detailed 3-4 sentence growth analysis. Use professional executive terminology focusing on yield maximization, strategic discounting for volume, or capitalizing on market scarcity."""
    return await generate_thought("Opportunistic Growth Agent", sys_prompt, state)

async def market_monitor_agent(state: AgenticState):
    sys_prompt = """You are the **Market Monitor Agent**.
Compare our situation with `market_competitor_name` and check the `max_market_premium` policy.
Context:
{context}

OUTPUT INSTRUCTION: Provide a concise but detailed 3-4 sentence competitive analysis. Use professional executive terminology focusing on market share, premium positioning, and competitor price elasticity."""
    return await generate_thought("Market Monitor Agent", sys_prompt, state)

async def inventory_agent(state: AgenticState):
    sys_prompt = """You are the **Inventory/Capacity Agent**.
Analyze the current fleet status and market demand. Determine if we have excess capacity or a supply crunch.

If availability is < 10% and demand is high, suggest BUYING more units.
If availability is > 70% for sustained periods, suggest DECOMMISSIONING (SELLING) units.

Context:
{context}

OUTPUT INSTRUCTION: Provide a concise 2-sentence inventory status report.
Include a specific recommendation in the format: [CAPACITY_ACTION: BUY X UNITS] or [CAPACITY_ACTION: SELL X UNITS].
Choose X based on the current context (e.g. 100-500 units)."""
    return await generate_thought("Inventory Agent", sys_prompt, state)

async def judge_agent(state: AgenticState):
    # This agent outputs structured JSON, so we treat it differently.
    sys_prompt = """You are the **Supreme Judge Agent**.
You have reviewed the thoughts from the Pricing, Conservative, Opportunistic, Market, and Capacity agents.
Your job is to make the FINAL decision.

## MANDATORY: USE COMPUTED DECISION BOUNDARIES
The `Computed_Decision_Boundaries` field contains pre-calculated price floors and ceilings.
You MUST use these exact values — do NOT re-derive or override them with your own math.

### Policy D Override Rule (CRITICAL):
If `Policy_D_Post_ROI_Floor` exists in `Computed_Decision_Boundaries`, then the hardware cost is RECOVERED
and the margin floor from Policy A is REPLACED by Policy D's lower floor for Spot workloads.
- If `Policy_D_Verdict` says "ACCEPT", you MUST approve the bid. The Conservative Agent's margin concerns
  are overridden because depreciation is a sunk cost on paid-off hardware.
- If `Policy_D_Verdict` says "REJECT", the bid is below even the post-ROI floor — reject it.

## ACTION MAPPING (follow strictly):
- **APPROVE**: The deal is accepted at the bid price (for Spot) or baseline price (for On-Demand). Use when no policy adjustments are needed.
- **OVERRIDE**: The deal is accepted but at a DIFFERENT price than baseline, due to market conditions, scarcity, or competitive pressure.
- **REJECT**: The deal is fundamentally unacceptable (e.g., bid below the applicable floor after all policy overrides).
- **EVICT**: Inventory is at 0, but the deal is worth fulfilling — an existing spot lease MUST be terminated to free capacity. 
  **CRITICAL RULE: If `available_inventory` is 0 and you want to accept an On-Demand request, you MUST use EVICT, not APPROVE or OVERRIDE.** Set `target_eviction_id` to "SPOT-LOWEST" to indicate the lowest-value spot lease should be reclaimed.

## POLICY CITATION (mandatory):
In your `explanation`, you MUST explicitly name the primary Policy that drove your decision:
- Policy A: `min_margin` (Margin Floor Protection)
- Policy B: `scarcity_threshold` / `scarcity_multiplier` (Scarcity-Driven Yield)
- Policy C: `eviction_delta` (Strategic Preemption)
- Policy D: `post_roi_discount_floor` (Lifecycle Aggression) — ONLY if `cost_recovered` is true
- Policy E: `max_market_premium` (Market Pulse / Competitive Ceiling)

Format: "Primary Policy: [Policy X — name]. Secondary: [Policy Y — name]."

## PROS/CONS FORMAT (mandatory):
In the `pros_cons` field, use this exact structure:
**PROS:**
- bullet 1
- bullet 2

**CONS:**
- bullet 1
- bullet 2

You MUST output a JSON object matching the `AgentDecision` schema exactly.
Set `action`, `final_price_per_hour`, `explanation`, `pros_cons`, and `target_eviction_id` (if EVICT).

Context:
{context}
"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", sys_prompt),
        ("user", "Make the final decision based on the previous agents' thoughts. Ensure the output strictly follows the required JSON schema.")
    ])
    
    structured_llm = llm.with_structured_output(AgentDecision, include_raw=False)
    chain = prompt | structured_llm
    
    decision: AgentDecision = await chain.ainvoke({"context": format_context(state)})
    
    # We also add the judge's summary as a thought so it streams to the UI nicely.
    request = state["request"]
    if decision.action != "REJECT":
        price_str = f" at ${decision.final_price_per_hour}/hr."
    else:
        if request.workload_type == "Spot" and request.bid_price_per_hour is not None:
            price_str = f" at ${request.bid_price_per_hour}/hr (bid price)."
        else:
            price_str = "."
            
    thought = AgentThought(
        agent_name="Supreme Judge",
        content=(
            f"Decision reached: {decision.action}{price_str}\n\n"
            f"{decision.pros_cons}\n\n"
            f"**EXPLANATION:**\n{decision.explanation}"
        )
    )
    
    return {"thoughts": [thought], "final_decision": decision.model_dump()}

async def bidding_agent(state: AgenticState):
    request = state["request"]
    current_bid = request.bid_price_per_hour if request.bid_price_per_hour else state["gpu_state"].market_price_per_hour
    
    sys_prompt = """You are the **Bidding Agent**. 
The Supreme Judge has REJECTED the previous offer. 
Analyze the situation and provide a counter-offer. 
Offer a price that is ~10-20% higher than the previous bid but still attractive.

Context:
{context}

OUTPUT INSTRUCTION: Output your thought process in 2 sentences. The last sentence MUST be the new counter-offer price in the exact format: [COUNTER_OFFER: X.XX]"""
    
    result = await generate_thought("Bidding Agent", sys_prompt, state)
    
    # Parse the counter offer from the thought
    thought_content = result["thoughts"][0].content
    new_price = current_bid * 1.15 # fallback
    import re
    match = re.search(r'\[COUNTER_OFFER:\s*\$?([\d.]+)\]', thought_content)
    if match:
        new_price = float(match.group(1))
    
    request.bid_price_per_hour = round(new_price, 2)
    return {
        "thoughts": result["thoughts"],
        "request": request
    }

async def policy_analyst_agent(state: AgenticState):
    sys_prompt = """You are the **Policy Analyst Agent**.
Given the Supreme Judge's final decision, perform a quick what-if scenario analysis. What if our policies were slightly more aggressive or conservative?
Context:
{context}

OUTPUT INSTRUCTION: Provide a concise but detailed 3-4 sentence scenario analysis. Use professional executive terminology focusing on sensitivity analysis, opportunity cost, and policy impact."""
    return await generate_thought("Policy Analyst", sys_prompt, state)

async def policy_critique_agent(state: AgenticState):
    sys_prompt = """You are the **Policy Critique Agent**.
Look at the Analyst's what-if scenario and the current policies. Critique the current settings and suggest better policy tweaks where warranted.

CRITICAL CONSTRAINT: You may ONLY suggest tweaks for the following 6 keys:
1. min_margin (e.g. 10%)
2. scarcity_threshold (e.g. 15)
3. scarcity_multiplier (e.g. 2.0x)
4. max_market_premium (e.g. 25%)
5. eviction_delta (e.g. $2.00)
6. post_roi_discount_floor (e.g. 40%)

Do NOT suggest hardware expansion or "dynamic inventory" here; that is for the Inventory Agent.

Context:
{context}

OUTPUT INSTRUCTION: Provide a concise 2-3 sentence policy critique.
Then, provide ONLY the policy suggestions that are genuinely warranted by the current situation — anywhere from 1 to all 6.
Do NOT force suggestions for policies that are already well-calibrated.
Format each suggestion on its own line as: [SUGGESTION: key=value]
(e.g., [SUGGESTION: min_margin=10%] or [SUGGESTION: scarcity_multiplier=1.5x])"""
    return await generate_thought("Policy Critique", sys_prompt, state)

# --- BUILD GRAPH ---

def build_graph():
    builder = StateGraph(AgenticState)
    
    builder.add_node("pricing", pricing_agent)
    builder.add_node("negative", negative_agent)
    builder.add_node("positive", positive_agent)
    builder.add_node("market", market_monitor_agent)
    builder.add_node("inventory", inventory_agent)
    builder.add_node("judge", judge_agent)
    builder.add_node("bidding", bidding_agent)
    builder.add_node("analyst", policy_analyst_agent)
    builder.add_node("critique", policy_critique_agent)
    
    # Routing function after critique
    def route_after_critique(state: AgenticState) -> str:
        decision = state.get("final_decision", {})
        action = decision.get("action", "") if decision else ""
        
        # If REJECTED, go to bidding agent to generate counter-offer
        if action == "REJECT":
            return "bidding"
        
        return END

    # Flow logic:
    builder.add_edge(START, "pricing")
    builder.add_edge("pricing", "negative")
    builder.add_edge("negative", "positive")
    builder.add_edge("positive", "market")
    builder.add_edge("market", "inventory")
    builder.add_edge("inventory", "judge")
    builder.add_edge("judge", "analyst")
    builder.add_edge("analyst", "critique")
    
    # Conditional edge from critique
    builder.add_conditional_edges("critique", route_after_critique, {
        "bidding": "bidding",
        END: END
    })
    
    builder.add_edge("bidding", END)
    
    return builder.compile()

multi_agent_app = build_graph()
