import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from core.models import LeaseRequest, GPUState
from core.chatbot import ChatbotExtractor
from core.calculator import ComputationLayer
from core.agent import PolicyAgent

from simulator.chaos_monkey import ChaosMonkeySimulator

# Force rich to use colors and not buffer even without a TTY
import os
os.environ["FORCE_COLOR"] = "1"

app = FastAPI(title="GPU Pricing Agent API")

# Silence health check logs from AWS App Runner
import logging
class HealthCheckFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Check both the raw message and the formatted args for uvicorn access logs
        msg = record.getMessage()
        return "GET /api/metrics" not in msg

# Apply to all relevant uvicorn loggers
logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())
logging.getLogger("uvicorn").addFilter(HealthCheckFilter())
logging.getLogger("uvicorn.error").addFilter(HealthCheckFilter())

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

class ChatMessage(BaseModel):
    role: str
    content: str
    
class ChatbotRequest(BaseModel):
    query: str
    history: list[ChatMessage] = []
    current_request: dict = None
    current_state: dict = None

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

@app.get("/api/admin/simulator")
async def get_admin_simulator_state(key: str, group_id: str = Query(default="default")):
    """Secure endpoint for instructors to monitor internal simulation state."""
    secret = os.environ.get("ADMIN_SECRET_KEY", "secret")
    if key != secret:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    sim = get_simulator(group_id)
    return sim.get_current_scenario_info()

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

@app.post("/api/chat")
async def process_chat(payload: ChatbotRequest, group_id: str = Query(default="default")):
    sim = get_simulator(group_id)
    
    base_state = None
    base_request = None
    base_policies = sim.policy_thresholds.copy()
    
    # Use exact context from frontend if provided
    if payload.current_request and payload.current_state:
        base_state = GPUState(**payload.current_state)
        base_request = LeaseRequest(**payload.current_request)
    # Otherwise fallback to simulator current state
    elif sim.active_tick and sim.active_tick.get("initial"):
        raw_state = sim.active_tick["initial"]["state"]
        raw_request = sim.active_tick["initial"]["request"]
        base_state = GPUState(**raw_state)
        base_request = LeaseRequest(**raw_request)
    elif len(sim.tick_history) > 0:
        last_tick = sim.tick_history[-1]
        raw_state = last_tick["state"]
        raw_request = last_tick["request"]
        base_state = GPUState(**raw_state)
        base_request = LeaseRequest(**raw_request)
    else:
        # Generate random state
        base_state = sim.generate_random_state()
        base_request = sim.generate_stochastic_request(base_state)
        
    extractor = ChatbotExtractor()
    extraction = await extractor.extract_overrides(payload.query, [h.model_dump() for h in payload.history])
    
    # Apply overrides
    req_overrides = extraction.request_overrides.model_dump(exclude_unset=True, exclude_none=True)
    for k, v in req_overrides.items():
        if hasattr(base_request, k):
            setattr(base_request, k, v)
            
    pol_overrides = extraction.policy_overrides.model_dump(exclude_unset=True, exclude_none=True)
    for k, v in pol_overrides.items():
        base_policies[k] = v
        
    # Recalculate
    calc = ComputationLayer()
    quote = calc.calculate_quote(base_request, base_state)
    
    # Evaluate
    agent = PolicyAgent()
    decision = await agent.evaluate_quote(base_request, quote, base_state, base_policies)
    
    return {
        "decision": decision.model_dump(),
        "extracted_params": extraction.model_dump(),
        "computed_quote": quote.model_dump()
    }

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
