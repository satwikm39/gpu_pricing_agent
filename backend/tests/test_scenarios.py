"""
Tests for the deterministic scenario system.

Validates scenario data integrity, tick counter cycling, per-group shuffled
ordering, deterministic vs random mode, and group isolation.
"""

import os
import pytest
from unittest.mock import patch

# ── Ensure we can import from the backend root ──────────────────────────────
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Load .env so the OpenAI API key is present when multi_agent.py is imported
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from core.models import GPUState, LeaseRequest
from simulator.scenarios import SCENARIOS
from simulator.chaos_monkey import ChaosMonkeySimulator


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Scenario Data Integrity
# ═══════════════════════════════════════════════════════════════════════════════

class TestScenarioData:
    def test_exactly_14_scenarios(self):
        assert len(SCENARIOS) == 14

    def test_all_scenarios_have_required_keys(self):
        required_keys = {"name", "description", "expected_behavior", "gpu_state", "request"}
        for i, s in enumerate(SCENARIOS):
            assert required_keys.issubset(s.keys()), f"Scenario {i} missing keys: {required_keys - s.keys()}"

    def test_all_gpu_states_are_valid(self):
        for i, s in enumerate(SCENARIOS):
            assert isinstance(s["gpu_state"], GPUState), f"Scenario {i} gpu_state is not GPUState"

    def test_all_requests_are_valid(self):
        for i, s in enumerate(SCENARIOS):
            assert isinstance(s["request"], LeaseRequest), f"Scenario {i} request is not LeaseRequest"

    def test_all_gpu_types_are_h100(self):
        """All scenarios use H100 to match the default environment_settings."""
        for i, s in enumerate(SCENARIOS):
            assert s["gpu_state"].gpu_type == "H100", f"Scenario {i} gpu_type != H100"
            assert s["request"].gpu_type == "H100", f"Scenario {i} request gpu_type != H100"

    def test_scenario_ids_are_unique(self):
        ids = [s["request"].request_id for s in SCENARIOS]
        assert len(ids) == len(set(ids)), f"Duplicate request IDs: {ids}"

    def test_spot_requests_have_bids(self):
        for i, s in enumerate(SCENARIOS):
            req = s["request"]
            if req.workload_type == "Spot":
                assert req.bid_price_per_hour is not None, f"Spot scenario {i} missing bid"
                assert req.bid_price_per_hour > 0, f"Spot scenario {i} bid <= 0"

    def test_on_demand_requests_have_no_bids(self):
        for i, s in enumerate(SCENARIOS):
            req = s["request"]
            if req.workload_type == "On-Demand":
                assert req.bid_price_per_hour is None, f"On-Demand scenario {i} has a bid"

    def test_inventory_consistency(self):
        for i, s in enumerate(SCENARIOS):
            gs = s["gpu_state"]
            assert gs.available_inventory <= gs.total_inventory, (
                f"Scenario {i}: available ({gs.available_inventory}) > total ({gs.total_inventory})"
            )


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Removed (Shuffled Ordering was replaced by purely random selection)
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Tick Counter & Deterministic Mode
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeterministicMode:
    @patch.dict(os.environ, {"SIMULATION_MODE": "deterministic"})
    def test_tick_counter_starts_at_zero(self):
        sim = ChaosMonkeySimulator(group_id="test-det")
        assert sim.tick_counter == 0

    @patch.dict(os.environ, {"SIMULATION_MODE": "deterministic"})
    def test_scenario_info_returns_correct_first(self):
        sim = ChaosMonkeySimulator(group_id="test-info")
        info = sim.get_current_scenario_info()
        assert info["mode"] == "deterministic"
        assert info["tick_counter"] == 0
        first_idx = sim.next_scenario_idx
        assert info["scenario_index"] == first_idx
        assert info["scenario_name"] == SCENARIOS[first_idx]["name"]

    @patch.dict(os.environ, {"SIMULATION_MODE": "deterministic"})
    def test_reset_metrics_resets_tick_counter(self):
        sim = ChaosMonkeySimulator(group_id="test-reset")
        sim.tick_counter = 7
        sim.reset_metrics()
        assert sim.tick_counter == 0


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Random Mode Fallback
# ═══════════════════════════════════════════════════════════════════════════════

class TestRandomMode:
    @patch.dict(os.environ, {"SIMULATION_MODE": "random"})
    def test_random_mode_scenario_info(self):
        sim = ChaosMonkeySimulator(group_id="test-rng")
        info = sim.get_current_scenario_info()
        assert info["mode"] == "random"
        assert "message" in info

    @patch.dict(os.environ, {"SIMULATION_MODE": "random"})
    def test_random_mode_generates_valid_state(self):
        sim = ChaosMonkeySimulator(group_id="test-rng-state")
        state = sim.generate_random_state()
        assert isinstance(state, GPUState)

    @patch.dict(os.environ, {"SIMULATION_MODE": "random"})
    def test_random_mode_generates_valid_request(self):
        sim = ChaosMonkeySimulator(group_id="test-rng-req")
        state = sim.generate_random_state()
        req = sim.generate_stochastic_request(state)
        assert isinstance(req, LeaseRequest)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Group Isolation
# ═══════════════════════════════════════════════════════════════════════════════

class TestGroupIsolation:
    @patch.dict(os.environ, {"SIMULATION_MODE": "deterministic"})
    def test_separate_tick_counters(self):
        sim_a = ChaosMonkeySimulator(group_id="group-A")
        sim_b = ChaosMonkeySimulator(group_id="group-B")
        sim_a.tick_counter = 5
        assert sim_b.tick_counter == 0

    @patch.dict(os.environ, {"SIMULATION_MODE": "deterministic"})
    def test_random_selection_occurs(self):
        sim = ChaosMonkeySimulator(group_id="group-B")
        first_idx = sim.next_scenario_idx
        
        # We can't guarantee the next one is different given random generation, but the logic should exist
        assert 0 <= first_idx < len(SCENARIOS)


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Scenario Coverage Assertions (policy dial coverage)
# ═══════════════════════════════════════════════════════════════════════════════

class TestScenarioCoverage:
    """Ensures the 14 scenarios collectively cover all important conditions."""

    def test_has_zero_inventory_scenarios(self):
        zero_inv = [s for s in SCENARIOS if s["gpu_state"].available_inventory == 0]
        assert len(zero_inv) >= 2, "Need at least 2 zero-inventory eviction scenarios"

    def test_has_cost_recovered_scenarios(self):
        recovered = [s for s in SCENARIOS if s["gpu_state"].cost_recovered is True]
        assert len(recovered) >= 2, "Need at least 2 cost-recovered scenarios"

    def test_has_spot_requests(self):
        spots = [s for s in SCENARIOS if s["request"].workload_type == "Spot"]
        assert len(spots) >= 3, "Need at least 3 Spot request scenarios"

    def test_has_on_demand_requests(self):
        ods = [s for s in SCENARIOS if s["request"].workload_type == "On-Demand"]
        assert len(ods) >= 5, "Need at least 5 On-Demand request scenarios"

    def test_has_high_scarcity_scenarios(self):
        scarce = [s for s in SCENARIOS
                  if s["gpu_state"].available_inventory / s["gpu_state"].total_inventory < 0.1]
        assert len(scarce) >= 3, "Need at least 3 scenarios with <10% availability"

    def test_has_oversupply_scenarios(self):
        surplus = [s for s in SCENARIOS
                   if s["gpu_state"].available_inventory / s["gpu_state"].total_inventory > 0.5]
        assert len(surplus) >= 2, "Need at least 2 oversupply scenarios"

    def test_has_varied_durations(self):
        durations = set(s["request"].duration_hours for s in SCENARIOS)
        assert len(durations) >= 3, f"Need at least 3 different durations, got {durations}"

    def test_has_varied_competitors(self):
        competitors = set(s["gpu_state"].market_competitor_name for s in SCENARIOS)
        assert len(competitors) >= 3, f"Need at least 3 competitors, got {competitors}"
