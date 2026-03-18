import os
import json
import operator
from typing import Annotated, TypedDict, List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END

from pydantic import BaseModel, Field
from .models import LeaseRequest, GPUState, AgentDecision, AgentThought, MultiAgentTrace

class AgenticState(TypedDict):
    request: LeaseRequest
    gpu_state: GPUState
    policy_thresholds: Dict[str, Any]
    thoughts: Annotated[List[AgentThought], operator.add]
    final_decision: Optional[Dict[str, Any]]

# Setup the global LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0.2, api_key=os.getenv("OPENAI_API_KEY"))

def format_context(state: AgenticState) -> str:
    ctx = {
        "Request": state["request"].model_dump(),
        "GPU_State": state["gpu_state"].model_dump(),
        "Policies": state["policy_thresholds"],
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
    sys_prompt = """You are the **Pricing Base Agent**. 
Establish a raw baseline price using `GPU_State.depreciation_cost_per_hour` and `power_opex_per_hour` + 20% margin.
Context:
{context}

OUTPUT INSTRUCTION: Provide a concise but detailed 3-4 sentence analysis. Use professional executive and financial terminology (e.g., OPEX, depreciation amortization, baseline margin thresholds)."""
    return await generate_thought("Pricing Base Agent", sys_prompt, state)

async def negative_agent(state: AgenticState):
    sys_prompt = """You are the **Conservative Risk Agent**.
Find reasons why we SHOULD NOT discount this deal or why we should reject. Focus on `min_margin`.
Context:
{context}

OUTPUT INSTRUCTION: Provide a concise but detailed 3-4 sentence risk analysis. Use professional executive terminology focusing on downside mitigation, margin erosion, and revenue protection."""
    return await generate_thought("Conservative Risk Agent", sys_prompt, state)

async def positive_agent(state: AgenticState):
    sys_prompt = """You are the **Opportunistic Growth Agent**.
Find reasons to say YES, discount aggressively (if `cost_recovered`), or surge price during scarcity.
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
You MUST output a JSON object matching the `AgentDecision` schema exactly.
Summarize the conflicting arguments in the `pros_cons` field.
Set `action` to APPROVE, REJECT, OVERRIDE, or EVICT.
Set `final_price_per_hour`.
Explain your decision in `explanation`.
Set `target_eviction_id` if EVICT.

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
    thought = AgentThought(
        agent_name="Supreme Judge",
        content=f"Decision reached: {decision.action} at ${decision.final_price_per_hour}/hr.\n\nPros/Cons:\n{decision.pros_cons}\n\nExplanation:\n{decision.explanation}"
    )
    
    return {"thoughts": [thought], "final_decision": decision.model_dump()}

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
    builder.add_node("analyst", policy_analyst_agent)
    builder.add_node("critique", policy_critique_agent)
    
    # Flow logic:
    # START -> Pricing -> Negative -> Positive -> Market -> Inventory -> Judge -> Analyst -> Critique -> END
    
    builder.add_edge(START, "pricing")
    builder.add_edge("pricing", "negative")
    builder.add_edge("negative", "positive")
    builder.add_edge("positive", "market")
    builder.add_edge("market", "inventory")
    builder.add_edge("inventory", "judge")
    builder.add_edge("judge", "analyst")
    builder.add_edge("analyst", "critique")
    builder.add_edge("critique", END)
    
    return builder.compile()

multi_agent_app = build_graph()
