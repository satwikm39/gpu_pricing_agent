import React, { useState, useEffect } from 'react';

const StaticCalculator = () => {
    // Default form configuration
    const [formData, setFormData] = useState({
        region: 'us-east-1',
        gpu_type: 'H100',
        quantity: 1,
        duration_hours: 1,
        workload_type: 'On-Demand',
        total_inventory: 1000,
        available_inventory: 500,
        active_spot_leases: 100,
        depreciation_cost_per_hour: 1.00,
        power_opex_per_hour: 0.50,
        cost_recovered: false
    });

    const [breakdown, setBreakdown] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch static calculations from the backend
    const calculateStaticMode = async () => {
        setLoading(true);
        try {
            const payload = {
                request: {
                    request_id: "CALC-001",
                    region: formData.region,
                    gpu_type: formData.gpu_type,
                    quantity: Number(formData.quantity),
                    duration_hours: Number(formData.duration_hours),
                    workload_type: formData.workload_type,
                },
                state: {
                    gpu_type: formData.gpu_type,
                    total_inventory: Number(formData.total_inventory),
                    available_inventory: Number(formData.available_inventory),
                    active_spot_leases: Number(formData.active_spot_leases),
                    depreciation_cost_per_hour: Number(formData.depreciation_cost_per_hour),
                    power_opex_per_hour: Number(formData.power_opex_per_hour),
                    cost_recovered: formData.cost_recovered
                }
            };
            
            const response = await fetch('http://localhost:8000/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            setBreakdown(data.quote);
        } catch (err) {
            console.error("Failed calculation:", err);
        } finally {
            setLoading(false);
        }
    };

    // Auto update when form changes
    useEffect(() => {
        calculateStaticMode();
    }, [formData]);

    const handleInput = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in py-4">
            {/* Input Variables Panel */}
            <div className="glass-panel p-6 flex flex-col gap-6 relative">
                <div className="bg-primary-500/10 w-full h-1 top-0 left-0 absolute"></div>
                
                <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                    <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Student Inputs
                </h2>
                
                <p className="text-sm text-slate-400">Adjust the theoretical environmental parameters to see how it alters the raw deterministic math calculation of the system.</p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-300">GPU Architecture</label>
                        <select name="gpu_type" value={formData.gpu_type} onChange={handleInput} className="bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:border-primary-500 focus:outline-none">
                            <option value="H100">H100 Hopper ($3.50 base)</option>
                            <option value="A100">A100 Ampere ($2.20 base)</option>
                            <option value="L40S">L40S Lovelace ($1.20 base)</option>
                            <option value="T4">T4 Turing ($0.40 base)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-300">Workload Type</label>
                        <select name="workload_type" value={formData.workload_type} onChange={handleInput} className="bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:border-primary-500 focus:outline-none">
                            <option value="On-Demand">On-Demand (Guaranteed)</option>
                            <option value="Spot">Spot (Evictable)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-300 flex justify-between">
                            Quantity Requested
                            <span className="text-primary-400">{formData.quantity} GPUs</span>
                        </label>
                        <input type="range" name="quantity" min="1" max="100" step="1" value={formData.quantity} onChange={handleInput} className="accent-primary-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-2" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-300 flex justify-between">
                            Lease Duration
                            <span className="text-primary-400">{formData.duration_hours} Hrs</span>
                        </label>
                        <input type="range" name="duration_hours" min="1" max="1000" step="1" value={formData.duration_hours} onChange={handleInput} className="accent-primary-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-2" />
                    </div>
                </div>

                <hr className="border-slate-700" />

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-300">Depreciation Cost ($/hr)</label>
                        <input type="number" name="depreciation_cost_per_hour" step="0.05" value={formData.depreciation_cost_per_hour} onChange={handleInput} className="bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:border-primary-500 focus:outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-300">Power OPEX ($/hr)</label>
                        <input type="number" name="power_opex_per_hour" step="0.05" value={formData.power_opex_per_hour} onChange={handleInput} className="bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:border-primary-500 focus:outline-none" />
                    </div>
                </div>
                
            </div>

            {/* Math Breakdown Panel */}
            <div className="glass-panel p-6 flex flex-col gap-6 relative">
                <div className="bg-accent-500/10 w-full h-1 top-0 left-0 absolute"></div>
                
                <h2 className="text-xl font-semibold flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Calculated Quote Breakdown
                    </div>
                    {loading && <div className="text-xs text-primary-500 font-mono flex items-center gap-1"><span className="animate-spin w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full block"></span> Calculating</div>}
                </h2>
                
                {breakdown ? (
                    <div className="flex flex-col gap-3 font-mono">
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-800/50 rounded-md">
                            <span className="text-slate-400">Target Base Rate</span>
                            <span className="text-white">${breakdown.base_rate.toFixed(2)} /hr</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 px-3 bg-red-900/10 border-l-[3px] border-red-500/50 rounded-r-md">
                            <span className="text-slate-400 flex flex-col">
                                Volume Discount (5%)
                                <span className="text-[10px] text-slate-500 font-sans mt-0.5">Triggers &gt; 50 instances</span>
                            </span>
                            <span className="text-red-400">- ${breakdown.volume_discount_amount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center py-2 px-3 bg-red-900/10 border-l-[3px] border-red-500/50 rounded-r-md">
                            <span className="text-slate-400 flex flex-col">
                                Duration Discount (10%)
                                <span className="text-[10px] text-slate-500 font-sans mt-0.5">Triggers &gt; 720 hr commit</span>
                            </span>
                            <span className="text-red-400">- ${breakdown.duration_discount_amount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center py-2 px-3 bg-red-900/10 border-l-[3px] border-red-500/50 rounded-r-md">
                            <span className="text-slate-400 flex flex-col">
                                Spot Discount (60%)
                                <span className="text-[10px] text-slate-500 font-sans mt-0.5">Workload is evictable</span>
                            </span>
                            <span className="text-red-400">- ${breakdown.spot_discount_amount.toFixed(2)}</span>
                        </div>

                        <div className="h-px bg-slate-700 my-2"></div>

                        <div className="flex justify-between items-center py-3 px-3">
                            <span className="text-white font-semibold font-sans">Final Proposed Quote</span>
                            <span className="text-2xl font-bold text-accent-400">${breakdown.base_price_per_hour.toFixed(2)} <span className="text-sm font-normal text-slate-400">/hr</span></span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="bg-slate-800 rounded-md p-3 border border-slate-700 text-center">
                                <div className="text-xs uppercase tracking-wider text-slate-500 font-sans mb-1">Fixed Cost Floor</div>
                                <div className="text-lg text-slate-300">${breakdown.total_cost.toFixed(2)}<span className="text-xs text-slate-500">/hr</span></div>
                            </div>
                            <div className={`rounded-md p-3 border text-center ${breakdown.margin_percentage < 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                                <div className="text-xs uppercase tracking-wider text-slate-500 font-sans mb-1">Theoretical Margin</div>
                                <div className={`text-lg font-bold ${breakdown.margin_percentage < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {(breakdown.margin_percentage * 100).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                        {breakdown.margin_percentage < 0 && (
                            <div className="text-[11px] text-red-400 text-center mt-2 font-sans flex items-center justify-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Math results in severe revenue loss. Dynamic Agent needed to protect margins.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Waiting for calculator variables...</div>
                )}
            </div>
        </div>
    );
};

export default StaticCalculator;
