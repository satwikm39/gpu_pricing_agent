import logging
from .models import LeaseRequest, ComputedQuote, GPUState

logger = logging.getLogger(__name__)

class ComputationLayer:
    """
    The Calculator: Processes the base math deterministically.
    """
    def __init__(self):
        # Base pricing per hour (fully amortized target price)
        self.BASE_RATES = {
            "B200": 5.50,
            "H200": 4.00,
            "H100": 3.50,
            "A100": 2.20,
            "L40S": 1.20,
            "V100": 1.10,
            "RTX4090": 1.80,
            "T4": 0.40,
        }
    
    def calculate_quote(self, request: LeaseRequest, gpu_state: GPUState) -> ComputedQuote:
        """
        Calculates the theoretical fair market base price before any policies are applied.
        """
        base_rate = self.BASE_RATES.get(request.gpu_type, 1.0)
        
        # Apply standard math modifiers (e.g., volume discounts, long duration discounts)
        volume_discount = 0.05 if request.quantity > 50 else 0.0
        duration_discount = 0.10 if request.duration_hours > 720 else 0.0 # 30 day discount
        
        spot_discount = 0.60 if request.workload_type == "Spot" else 0.0
        
        total_discount = min(volume_discount + duration_discount + spot_discount, 0.80) 
        
        final_base = base_rate * (1 - total_discount)
        
        # Calculate Margin
        total_cost = gpu_state.depreciation_cost_per_hour + gpu_state.power_opex_per_hour
        margin = (final_base - total_cost) / final_base if final_base > 0 else -1.0
        return ComputedQuote(
            request_id=request.request_id,
            base_rate=round(base_rate, 2),
            volume_discount_amount=round(base_rate * volume_discount, 2),
            duration_discount_amount=round(base_rate * duration_discount, 2),
            spot_discount_amount=round(base_rate * spot_discount, 2),
            total_cost=round(total_cost, 2),
            base_price_per_hour=round(final_base, 2),
            margin_percentage=round(margin, 4)
        )
