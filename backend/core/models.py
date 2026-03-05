from pydantic import BaseModel, Field
from typing import Optional, Literal

class LeaseRequest(BaseModel):
    request_id: str
    region: str
    gpu_type: Literal["H100", "A100", "L40S", "T4"]
    quantity: int
    duration_hours: float
    workload_type: Literal["On-Demand", "Spot"]
    bid_price_per_hour: Optional[float] = None
    
class GPUState(BaseModel):
    gpu_type: str
    total_inventory: int
    available_inventory: int
    active_spot_leases: int
    depreciation_cost_per_hour: float
    power_opex_per_hour: float
    cost_recovered: bool
    market_price_per_hour: float
    market_competitor_name: str

class ComputedQuote(BaseModel):
    request_id: str
    base_rate: float
    volume_discount_amount: float
    duration_discount_amount: float
    spot_discount_amount: float
    total_cost: float
    base_price_per_hour: float
    margin_percentage: float

class AgentDecision(BaseModel):
    request_id: str
    action: Literal["APPROVE", "REJECT", "OVERRIDE", "EVICT"]
    final_price_per_hour: float
    explanation: str
    target_eviction_id: Optional[str] = None
