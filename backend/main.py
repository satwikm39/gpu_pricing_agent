import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from core.models import LeaseRequest, GPUState

from simulator.chaos_monkey import ChaosMonkeySimulator

app = FastAPI(title="GPU Pricing Agent API")

class StaticCalculationPayload(BaseModel):
    request: LeaseRequest
    state: GPUState

cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Group-namespaced simulator registry ──────────────────────────────────────
# Each group_id maps to its own fully isolated ChaosMonkeySimulator instance.
# Instances are created lazily on first use.
simulators: dict[str, ChaosMonkeySimulator] = {}

def get_simulator(group_id: str) -> ChaosMonkeySimulator:
    """Return the simulator for the given group, creating it if it doesn't exist."""
    if group_id not in simulators:
        simulators[group_id] = ChaosMonkeySimulator(group_id=group_id)
    return simulators[group_id]
# ─────────────────────────────────────────────────────────────────────────────

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
async def get_settings(group_id: str = Query(default="default")):
    """Returns exactly what is set in the simulator currently."""
    return get_simulator(group_id).policy_thresholds

@app.get("/api/metrics")
async def get_metrics(group_id: str = Query(default="default")):
    """Returns the backend metrics tracking."""
    sim = get_simulator(group_id)
    return {
        "total_revenue": sim.total_revenue,
        "trust_score": sim.trust_score,
        "evictions": sim.evictions,
        "rejected_deals": sim.rejected_deals,
        "hardware_cost": sim.hardware_cost,
    }

@app.post("/api/metrics/reset")
async def reset_metrics(group_id: str = Query(default="default")):
    """Resets the backend metrics tracking counters."""
    get_simulator(group_id).reset_metrics()
    return {"status": "success", "message": "Metrics reset"}

@app.post("/api/settings")
async def update_settings(settings: SettingsUpdate, group_id: str = Query(default="default")):
    """Updates the policy thresholds on the agent."""
    sim = get_simulator(group_id)
    sim.policy_thresholds = {
        "min_margin": settings.min_margin,
        "scarcity_threshold": settings.scarcity_threshold,
        "scarcity_multiplier": settings.scarcity_multiplier,
        "max_market_premium": settings.max_market_premium,
        "eviction_delta": settings.eviction_delta,
        "post_roi_discount_floor": settings.post_roi_discount_floor
    }
    return {"status": "success", "new_settings": sim.policy_thresholds}

@app.post("/api/environment")
async def update_environment(env: EnvironmentUpdate, group_id: str = Query(default="default")):
    """Updates the underlying hardware costs in the simulator."""
    sim = get_simulator(group_id)
    sim.environment_settings = {
        "gpu_type": env.gpu_type,
        "depreciation_cost": env.depreciation_cost,
        "power_opex": env.power_opex
    }
    return {"status": "success", "new_environment": sim.environment_settings}

@app.get("/api/environment")
async def get_environment(group_id: str = Query(default="default")):
    """Returns the underlying hardware costs in the simulator."""
    return get_simulator(group_id).environment_settings

@app.post("/api/chaos/event")
async def trigger_chaos_event(event: ChaosEvent, group_id: str = Query(default="default")):
    """Overrides the Chaos Monkey's current simulation mode."""
    sim = get_simulator(group_id)
    sim.current_market_scenario = event.scenario
    return {"status": "success", "scenario": sim.current_market_scenario}

from sse_starlette.sse import EventSourceResponse
from typing import Optional, Dict, Any

class ReplayPayload(BaseModel):
    request: LeaseRequest
    state: GPUState
    policy_overrides: Optional[Dict[str, Any]] = None

@app.post("/api/tick/replay")
async def replay_tick_stream(payload: ReplayPayload, group_id: str = Query(default="default")):
    """
    Replays a specific frozen request+state through the multi-agent graph
    with optional policy overrides. Streams SSE output exactly like /api/tick/stream.
    Does NOT update simulator metrics — this is a pure what-if analysis.
    """
    sim = get_simulator(group_id)
    async def sse_generator():
        async for chunk_json in sim.run_replay_stream(
            request=payload.request,
            state=payload.state,
            policy_overrides=payload.policy_overrides
        ):
            yield {"data": chunk_json}

    return EventSourceResponse(sse_generator())


@app.post("/api/tick/execute")
async def execute_tick_stream(payload: ReplayPayload, group_id: str = Query(default="default")):
    """
    Executes a specific request+state through the multi-agent graph,
    updating the simulator metrics.
    """
    sim = get_simulator(group_id)
    async def sse_generator():
        async for chunk_json in sim.run_tick_stream(
            request=payload.request,
            state=payload.state
        ):
            yield {"data": chunk_json}

    return EventSourceResponse(sse_generator())

@app.get("/api/tick/active")
async def get_active_tick(group_id: str = Query(default="default")):
    """Returns the in-progress simulation tick for the group, if any."""
    return get_simulator(group_id).active_tick

@app.get("/api/tick/stream")
async def run_tick_stream(group_id: str = Query(default="default")):
    """Executes one tick of the simulation and streams the multi-agent thought process."""
    sim = get_simulator(group_id)
    async def sse_generator():
        async for chunk_json in sim.run_tick_stream():
            yield {"data": chunk_json}
    
    return EventSourceResponse(sse_generator())

@app.get("/api/events")
async def stream_events(group_id: str = Query(default="default")):
    """
    A persistent connection that 'pushes' global updates (metrics, history)
    to the frontend in real-time using the Broadcaster pattern.
    """
    sim = get_simulator(group_id)
    async def sse_generator():
        async for msg_json in sim.subscribe():
            yield {"data": msg_json}
    
    return EventSourceResponse(sse_generator())

@app.get("/api/history")
async def get_history(group_id: str = Query(default="default"), since: int = Query(default=0)):
    """Returns completed tick history for the group. Pass ?since=<id> to get only newer ticks."""
    sim = get_simulator(group_id)
    if since > 0:
        return [t for t in sim.tick_history if t["id"] > since]
    return sim.tick_history

@app.get("/api/debug/scenario")
async def get_scenario_info(group_id: str = Query(default="default")):
    """Developer-only: returns the next scenario that will be served for this group."""
    return get_simulator(group_id).get_current_scenario_info()

# Legacy calculate endpoint removed since multi-agent handles raw data directly.
@app.post("/api/calculate")
async def calculate_static(payload: StaticCalculationPayload):
    return {"error": "Static calculation is deprecated in favor of the multi-agent graph."}

STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.is_dir():
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for any non-API route (client-side routing)."""
        file = STATIC_DIR / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(STATIC_DIR / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
