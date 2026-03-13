import time
import random
import uuid
import os
import json
from dotenv import load_dotenv

from core.models import LeaseRequest, GPUState, AgentDecision
from core.multi_agent import multi_agent_app, AgenticState

from rich.console import Console

# Load env for OpenAI API Key
load_dotenv()

console = Console()

class ChaosMonkeySimulator:
    def __init__(self):
        # Internal State tracking
        self.total_revenue = 0.0
        self.evictions = 0
        self.trust_score = 100
        self.rejected_deals = 0
        self.hardware_cost = 250000.00 # Simulated cost of a small GPU fleet
        
        # Student configuration (The Sandbox)
        self.policy_thresholds = {
            "min_margin": "15%",
            "scarcity_threshold": "10", # 10%
            "scarcity_multiplier": "3.0",
            "max_market_premium": "20%", # 20% over market is the absolute limit
            "eviction_delta": "$1.50", # Must beat current spot by this amount to justify eviction
            "post_roi_discount_floor": "50%" # Deepest spot discount allowed on paid-off hardware
        }
        
        self.environment_settings = {
            "gpu_type": "H100",
            "depreciation_cost": 1.00,
            "power_opex": 0.50
        }
        
        self.current_market_scenario = "predictable" # 'predictable', 'demand_spike', 'market_slump'

    def generate_random_state(self) -> GPUState:
        gpu = self.environment_settings["gpu_type"]
        
        # Fleet Capacities by GPU Type
        fleet_scale = {
            "B200": 250,
            "H200": 500,
            "H100": 1000,
            "A100": 2500,
            "L40S": 5000,
            "V100": 8000,
            "RTX4090": 15000
        }
        total_inv = fleet_scale.get(gpu, 1000)

        # Scale availability based on current scenario and total inventory
        if self.current_market_scenario == "demand_spike":
            available = 0 # Force 0 inventory to trigger scarcity/evictions
            active_spot = int(total_inv * 0.8) # Lots of spot instances to evict
        elif self.current_market_scenario == "market_slump":
            available = int(total_inv * 0.95) # Massive oversupply
            active_spot = int(total_inv * 0.01)
        else:
            pct = random.choices([0.5, 0.05, 0], weights=[0.7, 0.2, 0.1])[0] # 70% half full, 20% scarce, 10% empty
            available = int(total_inv * pct)
            active_spot = int(total_inv * 0.2) if available < int(total_inv * 0.1) else int(total_inv * 0.05)
        
        # Simulate Live Market
        gpu = self.environment_settings["gpu_type"]
        if gpu == "H100":
            base_market = random.uniform(2.50, 4.00)
        elif gpu == "A100":
            base_market = random.uniform(1.20, 2.00)
        else:
            base_market = random.uniform(0.80, 1.50)
            
        competitor = random.choice(["AWS", "Azure", "CoreWeave", "Lambda Labs"])
        
        return GPUState(
            gpu_type=gpu,
            total_inventory=total_inv,
            available_inventory=available,
            active_spot_leases=active_spot,
            depreciation_cost_per_hour=float(self.environment_settings["depreciation_cost"]),
            power_opex_per_hour=float(self.environment_settings["power_opex"]),
            cost_recovered=random.choice([True, False]),
            market_price_per_hour=base_market,
            market_competitor_name=competitor
        )

    def generate_stochastic_request(self, state: GPUState) -> LeaseRequest:
        if self.current_market_scenario == "demand_spike" or state.available_inventory == 0:
            wt = "On-Demand"
        elif self.current_market_scenario == "market_slump":
            wt = "Spot"
        else:
            wt = random.choices(["On-Demand", "Spot"], weights=[0.4, 0.6])[0]
            
        bid = 0.80
        if wt == "Spot":
            if self.current_market_scenario == "market_slump":
                bid = random.uniform(0.10, 0.30)
            else:
                bid = random.uniform(0.60, 1.20)
            
        return LeaseRequest(
            request_id=f"REQ-{str(uuid.uuid4())[:6]}",
            region="us-east-1",
            gpu_type=state.gpu_type,
            quantity=random.randint(1, 8),
            duration_hours=random.choice([1, 24, 168]),
            workload_type=wt,
            bid_price_per_hour=bid if wt == "Spot" else None
        )

    async def run_tick_stream(self):
        """
        An async generator that streams the execution of the multi-agent graph.
        Yields JSON strings ready for SSE.
        """
        state = self.generate_random_state()
        request = self.generate_stochastic_request(state)
        
        # Send an initial event to the UI so it can display the request context immediately
        initial_data = {
            "type": "initial",
            "request": request.model_dump(),
            "state": state.model_dump(),
            "policies": self.policy_thresholds
        }
        yield json.dumps(initial_data)
        
        graph_input: AgenticState = {
            "request": request,
            "gpu_state": state,
            "policy_thresholds": self.policy_thresholds,
            "thoughts": []
        }
        
        # Astream yields updates from nodes as they finish
        async for event in multi_agent_app.astream(graph_input, stream_mode="updates"):
            for node_name, node_update in event.items():
                if "thoughts" in node_update and len(node_update["thoughts"]) > 0:
                    # Send the latest thought generated by this node
                    latest_thought = node_update["thoughts"][-1]
                    yield json.dumps({
                        "type": "thought",
                        "node": node_name,
                        "thought": latest_thought.model_dump()
                    })
                
                if "final_decision" in node_update and node_update["final_decision"]:
                    decision_dict = node_update["final_decision"]
                    decision_obj = AgentDecision(**decision_dict)
                    
                    # Update internal Simulator Metrics upon Judge completion
                    self._update_metrics(decision_obj, request)
                    
                    yield json.dumps({
                        "type": "final_decision",
                        "node": node_name,
                        "decision": decision_dict,
                        "metrics": {
                            "total_revenue": self.total_revenue,
                            "evictions": self.evictions,
                            "trust_score": self.trust_score,
                            "rejected_deals": self.rejected_deals,
                            "hardware_cost": self.hardware_cost,
                            "roi_percentage": (self.total_revenue / self.hardware_cost) * 100 if self.hardware_cost > 0 else 0
                        }
                    })

    async def run_replay_stream(self, request: LeaseRequest, state: GPUState, policy_overrides: dict = None):
        """
        Replays the exact same request+state through the multi-agent graph under
        (optionally) different policy thresholds. Does NOT update simulator metrics.
        This is a pure "what-if" analysis stream.
        """
        # Merge current policies with any overrides
        policies = {**self.policy_thresholds}
        if policy_overrides:
            policies.update(policy_overrides)

        # Re-emit the initial context so the frontend can display the deal card
        initial_data = {
            "type": "initial",
            "request": request.model_dump(),
            "state": state.model_dump(),
            "is_replay": True,
            "replay_policies": policies
        }
        yield json.dumps(initial_data)

        graph_input: AgenticState = {
            "request": request,
            "gpu_state": state,
            "policy_thresholds": policies,
            "thoughts": []
        }

        # Run the same multi-agent graph with frozen state
        async for event in multi_agent_app.astream(graph_input, stream_mode="updates"):
            for node_name, node_update in event.items():
                if "thoughts" in node_update and len(node_update["thoughts"]) > 0:
                    latest_thought = node_update["thoughts"][-1]
                    yield json.dumps({
                        "type": "thought",
                        "node": node_name,
                        "thought": latest_thought.model_dump(),
                        "is_replay": True
                    })

                if "final_decision" in node_update and node_update["final_decision"]:
                    decision_dict = node_update["final_decision"]
                    # NOTE: We intentionally do NOT call _update_metrics here —
                    # this is a hypothetical replay, not a real executed deal.
                    yield json.dumps({
                        "type": "final_decision",
                        "node": node_name,
                        "decision": decision_dict,
                        "is_replay": True,
                        "metrics": {
                            "total_revenue": self.total_revenue,
                            "evictions": self.evictions,
                            "trust_score": self.trust_score,
                            "rejected_deals": self.rejected_deals,
                            "hardware_cost": self.hardware_cost,
                            "roi_percentage": (self.total_revenue / self.hardware_cost) * 100 if self.hardware_cost > 0 else 0
                        }
                    })

    def _update_metrics(self, decision, request):
        if decision.action in ["APPROVE", "OVERRIDE"]:
            self.total_revenue += (decision.final_price_per_hour * request.quantity * request.duration_hours)
        elif decision.action == "EVICT":
            self.evictions += 1
            self.trust_score = max(0, self.trust_score - 2)
            self.total_revenue += (decision.final_price_per_hour * request.quantity * request.duration_hours)
        else:
            self.rejected_deals += 1

    def reset_metrics(self):
        self.total_revenue = 0.0
        self.evictions = 0
        self.trust_score = 100
        self.rejected_deals = 0
        self.hardware_cost = 250000.0

if __name__ == "__main__":
    console.print("[bold green]Starting Simulator...[/bold green]")


