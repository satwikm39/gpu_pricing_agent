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
    allow_origins=["*"], # Since it's a demo, allow all
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

class EnvironmentUpdate(BaseModel):
    gpu_type: str
    depreciation_cost: float
    power_opex: float

@app.get("/api/tick")
async def run_tick():
    """Executes one tick of the simulation and returns the result."""
    return simulator.run_tick_api()

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
        "roi_percentage": (simulator.total_revenue / simulator.hardware_cost) * 100 if simulator.hardware_cost > 0 else 0
    }

@app.post("/api/settings")
async def update_settings(settings: SettingsUpdate):
    """Updates the policy thresholds on the agent."""
    simulator.policy_thresholds = {
        "min_margin": settings.min_margin,
        "scarcity_threshold": settings.scarcity_threshold,
        "scarcity_multiplier": settings.scarcity_multiplier,
        "max_market_premium": settings.max_market_premium
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

@app.post("/api/calculate")
async def calculate_static(payload: StaticCalculationPayload):
    """Calculates the static base price and margin breakdown without running the agent."""
    quote = simulator.calculator.calculate_quote(payload.request, payload.state)
    return {"quote": quote.model_dump()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
