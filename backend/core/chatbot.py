import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

class PolicyOverrides(BaseModel):
    min_margin: Optional[str] = Field(None, description="Margin floor setting like '15%'")
    scarcity_threshold: Optional[str] = Field(None, description="Scarcity threshold percentage like '10'")
    scarcity_multiplier: Optional[str] = Field(None, description="Scarcity multiplier like '3.0'")
    max_market_premium: Optional[str] = Field(None, description="Max market premium like '20%'")
    eviction_delta: Optional[str] = Field(None, description="Eviction delta like '$1.50'")
    post_roi_discount_floor: Optional[str] = Field(None, description="Discount floor like '50%'")

class RequestOverrides(BaseModel):
    gpu_type: Optional[str] = Field(None, description="GPU type (e.g. H100, A100)")
    quantity: Optional[int] = Field(None, description="Quantity of GPUs requested")
    duration_hours: Optional[float] = Field(None, description="Duration in hours")
    workload_type: Optional[str] = Field(None, description="Workload type ('On-Demand' or 'Spot')")
    bid_price_per_hour: Optional[float] = Field(None, description="Bid price for Spot requests")

class ChatbotExtraction(BaseModel):
    policy_overrides: PolicyOverrides
    request_overrides: RequestOverrides

class ChatbotExtractor:
    def __init__(self, api_key: str = None):
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.0,
            api_key=api_key
        ).with_structured_output(ChatbotExtraction)

        self.system_prompt = """You are a smart "What-if" scenario parser for a GPU Pricing Agent simulation.
The user will ask hypothetical questions like "What if we change the margin floor to 30% and the request is for 4 A100s?".
Your job is to read the conversation history and the latest query, and output a structured JSON containing ANY explicit policy or request variable overrides they mention.
Only override variables they specifically ask to change.
If they do not provide a value for a specific field, leave it null/None. Never invent values.
"""
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("user", "Conversation History:\n{history}\n\nLatest Query: {query}")
        ])

    async def extract_overrides(self, query: str, history: List[Dict[str, str]]) -> ChatbotExtraction:
        formatted_history = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in history])
        if not formatted_history:
            formatted_history = "No previous history."
            
        try:
            extraction: ChatbotExtraction = await self.prompt_template.pipe(self.llm).ainvoke({
                "history": formatted_history,
                "query": query
            })
            return extraction
        except Exception as e:
            logger.error(f"Chatbot extraction failed: {e}")
            return ChatbotExtraction(
                policy_overrides=PolicyOverrides(),
                request_overrides=RequestOverrides()
            )

    async def generate_response(self, query: str, history: List[Dict[str, str]], state: Dict, policies: Dict, request: Dict, quote: Dict, decision: Dict, extraction: ChatbotExtraction, metrics: Dict = None) -> str:
        formatted_history = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in history])
        if not formatted_history:
            formatted_history = "No previous history."

        system_prompt = """You are an expert AI simulator assistant for a GPU Pricing Agent.
Your role is to answer user questions about pricing policies, expected margins, eviction rates, and market dynamics.
You are given the current GPU state, the current lease request, the applied policies, and the simulated decision outcome.

GUIDELINES:
1. **BE CONCISE**: Use 2-3 short paragraphs or bullet points maximum. Avoid long-winded policy definitions.
2. **USE NUMBERS**: Always provide quantitative estimates and figures using the provided state and policies. If state data is missing, use reasonable industry estimates.
3. **DO THE MATH**: If asked about margins, calculate them (e.g., "(Price $4.00 - Cost $1.50) / $4.00 = 62.5% margin").
4. **FLUID MARKDOWN**: Use headers (###), bolding (**), and bullet points.
5. **ACTIONABLE INSIGHTS**: Focus on the *impact* of policies on the bottom line, not just describing the policies.

Current Context:
- GPU Type: {state_gpu}
- Costs: ${cost_total}/hr (${depr} depr + ${pwr} power)
- Market Price: ${mkt}/hr
- Active Policies: {policies_summary}
- Cumulative Metrics: {metrics_summary}
"""

        # Pre-calculate context
        state_gpu = state.get('gpu_type', 'Unknown')
        depr = state.get('depreciation_cost_per_hour', 0)
        pwr = state.get('power_opex_per_hour', 0)
        cost_total = depr + pwr
        mkt = state.get('market_price_per_hour', 0)
        policies_summary = ", ".join([f"{k}: {v}" for k, v in policies.items()])
        metrics_summary = ", ".join([f"{k}: {v}" for k, v in metrics.items()]) if metrics else "No metrics available yet."

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt.format(
                state_gpu=state_gpu,
                depr=depr,
                pwr=pwr,
                cost_total=f"{cost_total:.2f}",
                mkt=mkt,
                policies_summary=policies_summary,
                metrics_summary=metrics_summary
            )),
            ("user", "Conversation History:\n{history}\n\nSimulated Context:\nRequest: {request}\nCalculated Quote: {quote}\nDecision Outcome: {decision}\n\nExtracted Overrides Applied:\n{overrides}\n\nUser Question: {query}")
        ])

        regular_llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            api_key=self.llm.openai_api_key if hasattr(self.llm, 'openai_api_key') else None
        )

        try:
            msg = await prompt.pipe(regular_llm).ainvoke({
                "history": formatted_history,
                "state": str(state),
                "policies": str(policies),
                "request": str(request),
                "quote": str(quote),
                "decision": str(decision),
                "overrides": extraction.model_dump_json(exclude_none=True),
                "query": query
            })
            return msg.content
        except Exception as e:
            logger.error(f"Chatbot response generation failed: {e}")
            return "I run into an error while generating a response. Please try again."
