import time
import random
import uuid
import os
from dotenv import load_dotenv

from core.models import LeaseRequest, GPUState
from core.calculator import ComputationLayer
from core.agent import PolicyAgent

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.live import Live
from rich.layout import Layout

# Load env for OpenAI API Key
load_dotenv()

console = Console()

class ChaosMonkeySimulator:
    def __init__(self):
        self.calculator = ComputationLayer()
        self.agent = PolicyAgent(api_key=os.getenv("OPENAI_API_KEY"))
        
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
            "max_market_premium": "20%" # 20% over market is the absolute limit
        }
        
        self.environment_settings = {
            "gpu_type": "H100",
            "depreciation_cost": 1.00,
            "power_opex": 0.50
        }

    def generate_random_state(self) -> GPUState:
        # Simulate a fleet of 1000 H100s
        available = random.choices([500, 50, 0], weights=[0.7, 0.2, 0.1])[0] # 70% normal, 20% scarce, 10% empty
        active_spot = 200 if available < 100 else 50
        
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
            gpu_type=self.environment_settings["gpu_type"],
            total_inventory=1000,
            available_inventory=available,
            active_spot_leases=active_spot,
            depreciation_cost_per_hour=float(self.environment_settings["depreciation_cost"]),
            power_opex_per_hour=float(self.environment_settings["power_opex"]),
            cost_recovered=random.choice([True, False]),
            market_price_per_hour=base_market,
            market_competitor_name=competitor
        )

    def generate_stochastic_request(self, state: GPUState) -> LeaseRequest:
        # Chaos Logic: If inventory is 0, someone REALLY wants an On-Demand instance
        if state.available_inventory == 0:
            wt = "On-Demand"
        else:
            wt = random.choices(["On-Demand", "Spot"], weights=[0.4, 0.6])[0]
            
        return LeaseRequest(
            request_id=f"REQ-{str(uuid.uuid4())[:6]}",
            region="us-east-1",
            gpu_type=state.gpu_type,
            quantity=random.randint(1, 8),
            duration_hours=random.choice([1, 24, 168]),
            workload_type=wt,
            bid_price_per_hour=0.80 if wt == "Spot" else None
        )

    def run_tick(self):
        state = self.generate_random_state()
        request = self.generate_stochastic_request(state)
        
        # 1. Computation Layer Calculates theoretical price
        quote = self.calculator.calculate_quote(request, state)
        
        # 2. Agentic Policy Layer Evaluates the quote
        start_time = time.time()
        decision = self.agent.evaluate_quote(request, quote, state, self.policy_thresholds)
        inference_time = time.time() - start_time
        
        # 3. Update Metrics
        if decision.action in ["APPROVE", "OVERRIDE"]:
            self.total_revenue += (decision.final_price_per_hour * request.quantity * request.duration_hours)
        elif decision.action == "EVICT":
            self.evictions += 1
            self.trust_score = max(0, self.trust_score - 2) # SLA Penalty
            self.total_revenue += (decision.final_price_per_hour * request.quantity * request.duration_hours)
        else:
            self.rejected_deals += 1

        # 4. Rich UI Display
        self.render_dashboard(state, request, quote, decision, inference_time)

    def run_tick_api(self):
        state = self.generate_random_state()
        request = self.generate_stochastic_request(state)
        
        # 1. Computation Layer Calculates theoretical price
        quote = self.calculator.calculate_quote(request, state)
        
        # 2. Agentic Policy Layer Evaluates the quote
        start_time = time.time()
        decision = self.agent.evaluate_quote(request, quote, state, self.policy_thresholds)
        inference_time = time.time() - start_time
        
        # 3. Update Metrics
        if decision.action in ["APPROVE", "OVERRIDE"]:
            self.total_revenue += (decision.final_price_per_hour * request.quantity * request.duration_hours)
        elif decision.action == "EVICT":
            self.evictions += 1
            self.trust_score = max(0, self.trust_score - 2) # SLA Penalty
            self.total_revenue += (decision.final_price_per_hour * request.quantity * request.duration_hours)
        else:
            self.rejected_deals += 1

        return {
            "state": state.model_dump(),
            "request": request.model_dump(),
            "quote": quote.model_dump(),
            "decision": decision.model_dump(),
            "metrics": {
                "total_revenue": self.total_revenue,
                "evictions": self.evictions,
                "trust_score": self.trust_score,
                "rejected_deals": self.rejected_deals,
                "hardware_cost": self.hardware_cost,
                "roi_percentage": (self.total_revenue / self.hardware_cost) * 100 if self.hardware_cost > 0 else 0
            },
            "inference_time": inference_time
        }

    def render_dashboard(self, state, request, quote, decision, inference_time):
        table = Table(title=f"Deal Desk Event: {request.request_id}", show_header=False)
        table.add_column("Key", style="cyan")
        table.add_column("Value", style="magenta")
        
        table.add_row("Context", f"Available: {state.available_inventory}/1000 | Type: {request.workload_type}")
        table.add_row("Raw Computed Quote", f"${quote.base_price_per_hour}/hr (Margin: {int(quote.margin_percentage*100)}%)")
        table.add_row("Live Market Pulse", f"${state.market_price_per_hour:.2f}/hr (from {state.market_competitor_name})")
        
        action_color = "green" if decision.action == "APPROVE" else "yellow" if decision.action == "OVERRIDE" else "red"
        
        table.add_row("Agent Action", f"[{action_color}]{decision.action}[/{action_color}]")
        table.add_row("Final Price", f"${decision.final_price_per_hour}/hr")
        
        # Glass-Box Explanation
        explanation = f"[bold italic white]{decision.explanation}[/bold italic white]"
        table.add_row("Glass-Box Logic", explanation)
        
        metrics = Table.grid(padding=1)
        metrics.add_row(f"💰 Revenue: ${self.total_revenue:,.2f}  |  🤝 Trust Score: {self.trust_score}/100  |  🛑 Evictions: {self.evictions}")
        
        panel = Panel(
            table,
            title=f"🤖 GPU Pricing Agent ({inference_time:.2f}s)",
            subtitle=metrics,
            border_style="blue"
        )
        
        console.print(panel)
        console.print("\n")

if __name__ == "__main__":
    console.print("[bold green]Starting Stochastic GPU Leasing Simulation...[/bold green]")
    console.print(f"Loaded Policies: Min Margin=15%, Scarcity Threshold=10%\n")
    sim = ChaosMonkeySimulator()
    
    try:
        for _ in range(5): # Run 5 ticks for the demo
            sim.run_tick()
            time.sleep(1)
    except KeyboardInterrupt:
        console.print("\n[bold red]Simulation Halted.[/bold red]")

