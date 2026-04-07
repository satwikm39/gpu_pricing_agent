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
