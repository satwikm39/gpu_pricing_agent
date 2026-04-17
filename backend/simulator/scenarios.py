"""
Deterministic Scenario Definitions for the GPU Pricing Agent.

Contains 14 pre-built (GPUState, LeaseRequest) pairs that exercise every policy
dial and agent persona.  Each group cycles through these in a seeded-shuffled
order so they *feel* random to students while being fully predictable for the
developer.
"""

import hashlib
import random as _random
from core.models import GPUState, LeaseRequest


# ── Scenario Definitions ─────────────────────────────────────────────────────
# Each entry is a dict with:
#   name             – human-readable label (developer only)
#   description      – what this scenario is testing
#   expected_behavior – what *should* happen under default policy thresholds
#   gpu_state        – frozen GPUState
#   request          – frozen LeaseRequest

SCENARIOS: list[dict] = [
    # ── 1. Healthy Approve ────────────────────────────────────────────────
    {
        "name": "Healthy Approve",
        "description": "Normal conditions — plenty of inventory, fair market price.",
        "expected_behavior": "OVERRIDE to $1.60 — aggressive undercut to capture market share from AWS ($3.20). Note: Agent rogue-ly cited post-ROI policy even though cost is not recovered.",
        "gpu_state": GPUState(
            gpu_type="H100",
            total_inventory=1000,
            available_inventory=500,
            active_spot_leases=50,
            depreciation_cost_per_hour=1.80,
            power_opex_per_hour=0.90,
            cost_recovered=False,
            market_price_per_hour=3.20,
            market_competitor_name="AWS",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC01",
            region="us-east-1",
            gpu_type="H100",
            quantity=4,
            duration_hours=24,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 2. Margin Floor Override ──────────────────────────────────────────
    {
        "name": "Margin Floor Override",
        "description": "Price would fall below the margin floor — tests Policy A.",
        "expected_behavior": "OVERRIDE to floor — Conservative Agent enforces min_margin.",
        "gpu_state": GPUState(
            gpu_type="A100",
            total_inventory=1000,
            available_inventory=600,
            active_spot_leases=30,
            depreciation_cost_per_hour=1.20,
            power_opex_per_hour=0.60,
            cost_recovered=False,
            market_price_per_hour=3.50,
            market_competitor_name="Azure",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC02",
            region="us-east-1",
            gpu_type="A100",
            quantity=2,
            duration_hours=1,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 3. Scarcity Surge ─────────────────────────────────────────────────
    {
        "name": "Scarcity Surge",
        "description": "Only 5% inventory left — tests Policy B (scarcity multiplier).",
        "expected_behavior": "OVERRIDE to ~$3.60 — scarcity multiplier (3.0x) triggers, but Policy E caps it at 20% above market ($3.00).",
        "gpu_state": GPUState(
            gpu_type="L40S",
            total_inventory=1000,
            available_inventory=50,
            active_spot_leases=100,
            depreciation_cost_per_hour=0.80,
            power_opex_per_hour=0.40,
            cost_recovered=False,
            market_price_per_hour=3.00,
            market_competitor_name="CoreWeave",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC03",
            region="us-east-1",
            gpu_type="L40S",
            quantity=8,
            duration_hours=168,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 4. Zero Inventory Eviction ────────────────────────────────────────
    {
        "name": "Zero Inventory Eviction",
        "description": "Zero available GPUs, many active spot leases — tests Policy C (eviction).",
        "expected_behavior": "EVICT at ~$4.56 — 0 inventory forces eviction of spot lease. Scarcity surge capped by Policy E at 20% above market ($3.80).",
        "gpu_state": GPUState(
            gpu_type="V100",
            total_inventory=1000,
            available_inventory=0,
            active_spot_leases=200,
            depreciation_cost_per_hour=0.60,
            power_opex_per_hour=0.30,
            cost_recovered=False,
            market_price_per_hour=3.80,
            market_competitor_name="Lambda Labs",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC04",
            region="us-east-1",
            gpu_type="V100",
            quantity=4,
            duration_hours=24,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 5. Post-ROI Spot Discount ─────────────────────────────────────────
    {
        "name": "Post-ROI Spot Discount",
        "description": "Hardware cost recovered — tests Policy D (lifecycle aggression).",
        "expected_behavior": "REJECT — $0.90 bid is 50% below the $1.80 baseline. Conservative Agent enforces margin floor even with cost recovered.",
        "gpu_state": GPUState(
            gpu_type="H200",
            total_inventory=1000,
            available_inventory=300,
            active_spot_leases=40,
            depreciation_cost_per_hour=2.20,
            power_opex_per_hour=1.10,
            cost_recovered=True,
            market_price_per_hour=2.80,
            market_competitor_name="AWS",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC05",
            region="us-east-1",
            gpu_type="H200",
            quantity=2,
            duration_hours=1,
            workload_type="Spot",
            bid_price_per_hour=0.90,
        ),
    },
    # ── 6. Market Ceiling Cap ─────────────────────────────────────────────
    {
        "name": "Market Ceiling Cap",
        "description": "Proposed price far above competitor — tests Policy E (market premium cap).",
        "expected_behavior": "OVERRIDE to ceiling — Market Monitor caps price to stay competitive.",
        "gpu_state": GPUState(
            gpu_type="RTX4090",
            total_inventory=1000,
            available_inventory=400,
            active_spot_leases=60,
            depreciation_cost_per_hour=1.00,
            power_opex_per_hour=0.50,
            cost_recovered=False,
            market_price_per_hour=2.50,
            market_competitor_name="Azure",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC06",
            region="us-east-1",
            gpu_type="RTX4090",
            quantity=6,
            duration_hours=168,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 7. Lowball Spot Reject ────────────────────────────────────────────
    {
        "name": "Lowball Spot Reject",
        "description": "Absurdly low spot bid, cost NOT recovered — tests Policy A + D.",
        "expected_behavior": "REJECT — bid far below cost floor, no ROI discount applies.",
        "gpu_state": GPUState(
            gpu_type="B200",
            total_inventory=1000,
            available_inventory=700,
            active_spot_leases=20,
            depreciation_cost_per_hour=3.00,
            power_opex_per_hour=1.50,
            cost_recovered=False,
            market_price_per_hour=3.00,
            market_competitor_name="CoreWeave",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC07",
            region="us-east-1",
            gpu_type="B200",
            quantity=1,
            duration_hours=24,
            workload_type="Spot",
            bid_price_per_hour=0.15,
        ),
    },
    # ── 8. Demand Spike Full Fleet ────────────────────────────────────────
    {
        "name": "Demand Spike Full Fleet",
        "description": "Complete fleet exhaustion with many spot leases — tests Policy B + C.",
        "expected_behavior": "EVICT at ~$4.80 — 0 inventory forces eviction. Scarcity surge capped by Policy E at 20% above market ($4.00).",
        "gpu_state": GPUState(
            gpu_type="H100",
            total_inventory=1000,
            available_inventory=0,
            active_spot_leases=800,
            depreciation_cost_per_hour=1.80,
            power_opex_per_hour=0.90,
            cost_recovered=False,
            market_price_per_hour=4.00,
            market_competitor_name="Lambda Labs",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC08",
            region="us-east-1",
            gpu_type="H100",
            quantity=8,
            duration_hours=168,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 9. Market Slump Oversupply ────────────────────────────────────────
    {
        "name": "Market Slump Oversupply",
        "description": "Massive oversupply, low market price — tests Policy E + A.",
        "expected_behavior": "REJECT — $0.60 bid is too far below $1.80 baseline (66% discount). Conservative Agent protects margin even in oversupply.",
        "gpu_state": GPUState(
            gpu_type="A100",
            total_inventory=1000,
            available_inventory=950,
            active_spot_leases=10,
            depreciation_cost_per_hour=1.20,
            power_opex_per_hour=0.60,
            cost_recovered=False,
            market_price_per_hour=1.80,
            market_competitor_name="AWS",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC09",
            region="us-east-1",
            gpu_type="A100",
            quantity=4,
            duration_hours=24,
            workload_type="Spot",
            bid_price_per_hour=0.60,
        ),
    },
    # ── 10. Borderline Margin ─────────────────────────────────────────────
    {
        "name": "Borderline Margin",
        "description": "Price sits right at the margin boundary — tests agent debate.",
        "expected_behavior": "Agent debate — Conservative and Opportunistic clash at the boundary.",
        "gpu_state": GPUState(
            gpu_type="L40S",
            total_inventory=1000,
            available_inventory=400,
            active_spot_leases=50,
            depreciation_cost_per_hour=0.80,
            power_opex_per_hour=0.40,
            cost_recovered=False,
            market_price_per_hour=3.10,
            market_competitor_name="Azure",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC10",
            region="us-east-1",
            gpu_type="L40S",
            quantity=2,
            duration_hours=24,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 11. High-Value Long Lease ─────────────────────────────────────────
    {
        "name": "High-Value Long Lease",
        "description": "Large request, long duration, moderate scarcity — massive revenue opportunity.",
        "expected_behavior": "OVERRIDE to ~$3.00 — undercuts CoreWeave ($3.50) while maintaining strong margin above $1.73 floor. 8×168h = $4,032 revenue.",
        "gpu_state": GPUState(
            gpu_type="V100",
            total_inventory=1000,
            available_inventory=200,
            active_spot_leases=80,
            depreciation_cost_per_hour=0.60,
            power_opex_per_hour=0.30,
            cost_recovered=False,
            market_price_per_hour=3.50,
            market_competitor_name="CoreWeave",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC11",
            region="us-east-1",
            gpu_type="V100",
            quantity=8,
            duration_hours=168,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 12. Post-ROI Eviction Dilemma ─────────────────────────────────────
    {
        "name": "Post-ROI Eviction Dilemma",
        "description": "Zero inventory + cost recovered — tests Policy C + D interaction.",
        "expected_behavior": "EVICT — 0 inventory forces eviction. Cost recovered softens impact. Policy C + D interaction.",
        "gpu_state": GPUState(
            gpu_type="H200",
            total_inventory=1000,
            available_inventory=0,
            active_spot_leases=500,
            depreciation_cost_per_hour=2.20,
            power_opex_per_hour=1.10,
            cost_recovered=True,
            market_price_per_hour=3.00,
            market_competitor_name="Lambda Labs",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC12",
            region="us-east-1",
            gpu_type="H200",
            quantity=4,
            duration_hours=24,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 13. Competitive Pressure ──────────────────────────────────────────
    {
        "name": "Competitive Pressure",
        "description": "Competitor undercuts heavily — tests Policy E (market pressure).",
        "expected_behavior": "OVERRIDE — must match lower competitor pricing or lose the deal.",
        "gpu_state": GPUState(
            gpu_type="RTX4090",
            total_inventory=1000,
            available_inventory=600,
            active_spot_leases=30,
            depreciation_cost_per_hour=1.00,
            power_opex_per_hour=0.50,
            cost_recovered=False,
            market_price_per_hour=2.00,
            market_competitor_name="AWS",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC13",
            region="us-east-1",
            gpu_type="RTX4090",
            quantity=4,
            duration_hours=24,
            workload_type="On-Demand",
            bid_price_per_hour=None,
        ),
    },
    # ── 14. Spot in Scarcity ──────────────────────────────────────────────
    {
        "name": "Spot in Scarcity",
        "description": "Spot request during inventory scarcity — tests Policy A + B clash.",
        "expected_behavior": "REJECT or low OVERRIDE — spot during scarcity is risky.",
        "gpu_state": GPUState(
            gpu_type="B200",
            total_inventory=1000,
            available_inventory=30,
            active_spot_leases=100,
            depreciation_cost_per_hour=3.00,
            power_opex_per_hour=1.50,
            cost_recovered=False,
            market_price_per_hour=3.50,
            market_competitor_name="Azure",
        ),
        "request": LeaseRequest(
            request_id="REQ-SC14",
            region="us-east-1",
            gpu_type="B200",
            quantity=2,
            duration_hours=1,
            workload_type="Spot",
            bid_price_per_hour=1.00,
        ),
    },
]


# def get_shuffled_order(group_id: str) -> list[int]:
#     """
#     Return a deterministic-but-unique ordering of scenario indices for a group.

#     Uses a SHA-256 hash of the group_id as the random seed so:
#       - The same group_id always gets the same ordering.
#       - Different group_ids get different orderings.
#       - Students cannot predict the sequence without knowing the hash.
#     """
#     seed = int(hashlib.sha256(group_id.encode()).hexdigest(), 16) % (2**32)
#     rng = _random.Random(seed)
#     indices = list(range(len(SCENARIOS)))
#     rng.shuffle(indices)
#     return indices
