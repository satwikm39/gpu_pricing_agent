import json
import logging
from .models import LeaseRequest, ComputedQuote, GPUState, AgentDecision
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import Field

logger = logging.getLogger(__name__)

class PolicyAgent:
    """
    The Governor & Explainer: Enforces business logic over the raw math and generates Glass-Box explanations.
    """
    def __init__(self, api_key: str = None):
        # We use a structured output LLM to guarantee JSON formatting of the AgentDecision
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.2,
            api_key=api_key
        ).with_structured_output(AgentDecision)
        
        self.system_prompt = """You are the 'Agentic Policy Governor' for a GPU Leasing platform.
Your job is to evaluate an incoming lease request and the mathematically proposed quote, and decide the final action based on 4 strict Financial Policies.
You act as a "Glass-Box", meaning your `explanation` field must clearly defend your numerical calculations to the user.

--- CORE POLICIES ---

POLICY A: Margin Floor Protection
- Rule: The absolute lowest price we can charge is the (`Calculated_Base_Quote.total_cost`).
- The Target Margin Floor is defined as (`total_cost` * (1 + {min_margin})). For example, if total_cost is $1.50 and min_margin is 0.15 (15%), the floor is $1.72.
- IF `Calculated_Base_Quote.base_price_per_hour` is strictly LESS than the Target Margin Floor, THEN you MUST set action="OVERRIDE" and set the `final_price_per_hour` to the calculated floor.
- In your explanation, explicitly cite the exact numerical floor required and why the bid was rejected (Unless Policy D applies).

POLICY B: Scarcity-Driven Yield Management
- Rule: IF `Live_GPU_Fleet_State.available_inventory` as a percentage of `total_inventory` is LESS than {scarcity_threshold}%, THEN apply a {scarcity_multiplier}x multiplier to the `Calculated_Base_Quote.base_price_per_hour`. action="OVERRIDE".

POLICY C: Strategic Preemption (Eviction)
- Rule: If a high-paying 'On-Demand' request arrives, but `available_inventory` is 0, AND `active_spot_leases` > 0, you MUST Evict a spot instance to serve the On-Demand customer.
- action="EVICT". Set `target_eviction_id` to a placeholder ID like "SPOT-1234".
- Your explanation MUST be polite.

POLICY D: Lifecycle Aggression (Cost Recovery)
- Rule: If `Live_GPU_Fleet_State.cost_recovered` is TRUE, the hardware is pure profit. Bypass Policy A entirely and APPROVE any Spot bid, no matter how low.

POLICY E: Market Competitiveness
- Rule: The user has set a maximum premium over live market rates of {max_market_premium}.
- IF the `Calculated_Base_Quote.base_price_per_hour` is strictly GREATER than `Live_GPU_Fleet_State.market_price_per_hour` * (1 + {max_market_premium}), THEN you MUST set action="OVERRIDE" and lower the `final_price_per_hour` to exactly match that maximum allowable premium ceiling.
- In your explanation, you MUST explicitly cite the competitor's name (`Live_GPU_Fleet_State.market_competitor_name`) and their live price (`Live_GPU_Fleet_State.market_price_per_hour`), stating that you are lowering the quote to prevent losing the deal to them locally.
- CRITICAL EXCEPTION: Policy A (Margin Floor) takes absolute precedence! NEVER lower a price below the Target Margin Floor, even if it means losing the deal to the competitor.

--- INPUT STATE ---
{state_json}

--- INSTRUCTIONS ---
Analyze the input state. Determine which policies trigger.
Return a structured JSON decision with the final action, price, and a "Glass-Box" explanation for the user.
"""

        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("user", "Evaluate this request.")
        ])

    def evaluate_quote(self, 
                      request: LeaseRequest, 
                      quote: ComputedQuote, 
                      gpu_state: GPUState,
                      policy_thresholds: dict) -> AgentDecision:
        
        # Format the state for the LLM
        state_dict = {
            "Request": request.model_dump(),
            "Calculated_Base_Quote": quote.model_dump(),
            "Live_GPU_Fleet_State": gpu_state.model_dump()
        }
        
        # Calculate percentage for policy B
        inv_pct = (gpu_state.available_inventory / gpu_state.total_inventory) * 100 if gpu_state.total_inventory > 0 else 0
        
        try:
            # We don't have async here for simplicity of the CLI simulator
            decision: AgentDecision = self.prompt_template.pipe(self.llm).invoke({
                "min_margin": policy_thresholds.get("min_margin", "10%"),
                "scarcity_threshold": policy_thresholds.get("scarcity_threshold", "10"),
                "scarcity_multiplier": policy_thresholds.get("scarcity_multiplier", "2.5"),
                "max_market_premium": policy_thresholds.get("max_market_premium", "20%"),
                "state_json": json.dumps(state_dict, indent=2)
            })
            return decision
        except Exception as e:
            logger.error(f"Agent failed to evaluate quote: {e}")
            # Fallback deterministic safety
            return AgentDecision(
                request_id=request.request_id,
                action="APPROVE" if quote.margin_percentage > 0 else "REJECT",
                final_price_per_hour=quote.base_price_per_hour,
                explanation="Fallback safely due to AI routing error."
            )
