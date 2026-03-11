import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.models import LeaseRequest, GPUState

from simulator.chaos_monkey import ChaosMonkeySimulator

app = FastAPI(title="GPU Pricing Agent API")

class StaticCalculationPayload(BaseModel):
    request: LeaseRequest
    state: GPUState

# Setup CORS to allow the frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the global simulator state
simulator = ChaosMonkeySimulator()

class SettingsUpdate(BaseModel):
    min_margin: str
    scarcity_threshold: str
    scarcity_multiplier: str
    max_market_premium: str
    eviction_delta: str
    post_roi_discount_floor: str

class EnvironmentUpdate(BaseModel):
    gpu_type: str
    depreciation_cost: float
    power_opex: float

class ChaosEvent(BaseModel):
    scenario: str # 'predictable', 'demand_spike', 'market_slump'

@app.get("/api/settings")
async def get_settings():
    """Returns exactly what is set in the simulator currently."""
    return simulator.policy_thresholds

@app.get("/api/metrics")
async def get_metrics():
    """Returns the backend metrics tracking."""
    return {
        "total_revenue": simulator.total_revenue,
        "trust_score": simulator.trust_score,
        "evictions": simulator.evictions,
        "rejected_deals": simulator.rejected_deals,
        "hardware_cost": simulator.hardware_cost,
    }

@app.post("/api/metrics/reset")
async def reset_metrics():
    """Resets the backend metrics tracking counters."""
    simulator.reset_metrics()
    return {"status": "success", "message": "Metrics reset"}

@app.post("/api/settings")
async def update_settings(settings: SettingsUpdate):
    """Updates the policy thresholds on the agent."""
    simulator.policy_thresholds = {
        "min_margin": settings.min_margin,
        "scarcity_threshold": settings.scarcity_threshold,
        "scarcity_multiplier": settings.scarcity_multiplier,
        "max_market_premium": settings.max_market_premium,
        "eviction_delta": settings.eviction_delta,
        "post_roi_discount_floor": settings.post_roi_discount_floor
    }
    return {"status": "success", "new_settings": simulator.policy_thresholds}

@app.post("/api/environment")
async def update_environment(env: EnvironmentUpdate):
    """Updates the underlying hardware costs in the simulator."""
    simulator.environment_settings = {
        "gpu_type": env.gpu_type,
        "depreciation_cost": env.depreciation_cost,
        "power_opex": env.power_opex
    }
    return {"status": "success", "new_environment": simulator.environment_settings}

@app.post("/api/chaos/event")
async def trigger_chaos_event(event: ChaosEvent):
    """Overrides the Chaos Monkey's current simulation mode."""
    simulator.current_market_scenario = event.scenario
    return {"status": "success", "scenario": simulator.current_market_scenario}

from sse_starlette.sse import EventSourceResponse


@app.get("/api/tick/stream")
async def run_tick_stream():
    """Executes one tick of the simulation and streams the multi-agent thought process."""
    # Wrap the generator to yield standard SSE string formats or dicts expected by EventSourceResponse
    async def sse_generator():
        async for chunk_json in simulator.run_tick_stream():
            yield {"data": chunk_json}
    
    return EventSourceResponse(sse_generator())

# Legacy calculate endpoint removed since multi-agent handles raw data directly.
@app.post("/api/calculate")
async def calculate_static(payload: StaticCalculationPayload):
    return {"error": "Static calculation is deprecated in favor of the multi-agent graph."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
