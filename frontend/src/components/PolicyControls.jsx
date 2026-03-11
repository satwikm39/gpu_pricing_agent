import React, { useState } from 'react';

const PolicyControls = () => {
    const [settings, setSettings] = useState({
        min_margin: '15',
        scarcity_threshold: '10',
        scarcity_multiplier: '3.0',
        max_market_premium: '20',
        eviction_delta: '1.50',
        post_roi_discount_floor: '50'
    });
    const [envSettings, setEnvSettings] = useState({
        gpu_type: 'H100',
        depreciation_cost: 1.00,
        power_opex: 0.50
    });
    
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [envSaving, setEnvSaving] = useState(false);
    const [envSaved, setEnvSaved] = useState(false);

    const [activeEvent, setActiveEvent] = useState('predictable');

    const handleChange = (e) => {
        setSettings({
            ...settings,
            [e.target.name]: e.target.value
        });
        setSaved(false);
    };

    const handleEnvChange = (e) => {
        const { value } = e.target;
        
        // Define hardcoded business defaults based on GPU tier
        const gpuConfig = {
            'B200': { dep: 2.50, opex: 1.25 },
            'H200': { dep: 1.50, opex: 0.75 },
            'H100': { dep: 1.00, opex: 0.50 },
            'A100': { dep: 0.60, opex: 0.35 },
            'L40S': { dep: 0.30, opex: 0.20 },
            'V100': { dep: 0.15, opex: 0.10 },
            'RTX4090': { dep: 0.05, opex: 0.05 }
        };
        
        const config = gpuConfig[value] || gpuConfig['H100'];

        setEnvSettings({
            gpu_type: value,
            depreciation_cost: config.dep,
            power_opex: config.opex
        });
        setEnvSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                min_margin: `${settings.min_margin}%`,
                scarcity_threshold: settings.scarcity_threshold,
                scarcity_multiplier: settings.scarcity_multiplier,
                max_market_premium: `${settings.max_market_premium}%`,
                eviction_delta: `$${settings.eviction_delta}`,
                post_roi_discount_floor: `${settings.post_roi_discount_floor}%`
            };
            
            await fetch('http://localhost:8000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch(err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleEnvSave = async () => {
        setEnvSaving(true);
        try {
            await fetch('http://localhost:8000/api/environment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envSettings)
            });
            setEnvSaved(true);
            setTimeout(() => setEnvSaved(false), 2000);
        } catch(err) {
            console.error(err);
        } finally {
            setEnvSaving(false);
        }
    };

    const triggerChaosEvent = async (scenario) => {
        setActiveEvent(scenario);
        try {
            await fetch('http://localhost:8000/api/chaos/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario })
            });
        } catch(err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="glass-panel p-5 flex flex-col gap-5">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Policy Sandbox
            </h3>

            <div>
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium">Min Margin Floor (%)</label>
                    <span className="text-accent-400 font-mono bg-accent-500/10 px-2 py-0.5 rounded">{settings.min_margin}%</span>
                </div>
                <input 
                    type="range" 
                    name="min_margin"
                    min="0" max="50" step="1"
                    value={settings.min_margin}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent-500"
                />
                <p className="text-xs text-slate-500 mt-2">Prevents AI from executing deals below fixed costs + margin protection.</p>
            </div>

            <div>
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium">Scarcity Threshold (%)</label>
                    <span className="text-red-400 font-mono bg-red-500/10 px-2 py-0.5 rounded">&lt; {settings.scarcity_threshold}%</span>
                </div>
                <input 
                    type="range" 
                    name="scarcity_threshold"
                    min="5" max="30" step="1"
                    value={settings.scarcity_threshold}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
            </div>

            <div>
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium">Scarcity Multiplier (x)</label>
                    <span className="text-yellow-400 font-mono bg-yellow-500/10 px-2 py-0.5 rounded">{settings.scarcity_multiplier}x</span>
                </div>
                <input 
                    type="range" 
                    name="scarcity_multiplier"
                    min="1.0" max="5.0" step="0.1"
                    value={settings.scarcity_multiplier}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
                <p className="text-xs text-slate-500 mt-2">Price surge when available inventory drops below threshold.</p>
            </div>

            <div className="pt-2 border-t border-slate-700/50">
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-2">Max Market Premium (%)</label>
                    <span className="text-pink-400 font-mono bg-pink-500/10 px-2 py-0.5 rounded">{settings.max_market_premium}%</span>
                </div>
                <input 
                    type="range" 
                    name="max_market_premium"
                    min="0" max="100" step="5"
                    value={settings.max_market_premium}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                    <span>Matches Competitor</span>
                    <span>100% markup allowed</span>
                </div>
            </div>

            <div className="pt-2 border-t border-slate-700/50">
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-2">Eviction Delta ($)</label>
                    <span className="text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded">${settings.eviction_delta}</span>
                </div>
                <input 
                    type="range" 
                    name="eviction_delta"
                    min="0.10" max="5.00" step="0.10"
                    value={settings.eviction_delta}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Min. gap to kick Spot user for On-Demand</p>
            </div>

            <div className="pt-2 border-t border-slate-700/50">
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-2">Post-ROI Spot Discount (%)</label>
                    <span className="text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">{settings.post_roi_discount_floor}%</span>
                </div>
                <input 
                    type="range" 
                    name="post_roi_discount_floor"
                    min="0" max="100" step="5"
                    value={settings.post_roi_discount_floor}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Max spot discount on Paid-Off cards (Bypasses Margin Floor)</p>
            </div>

            <button 
                onClick={handleSave}
                disabled={saving || saved}
                className={`w-full py-2.5 mt-2 rounded-lg font-bold text-sm transition-all duration-300 shadow-lg ${saved ? 'bg-green-600/90 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'}`}
            >
                {saving ? 'Syncing...' : saved ? 'Policy Live!' : 'Deploy New Policies'}
            </button>
        </div>

        <div className="glass-panel p-5 flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2 relative z-10">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Hardware Portfolio
            </h3>

            <div className="relative z-10">
                <select 
                    name="gpu_type"
                    value={envSettings.gpu_type}
                    onChange={handleEnvChange}
                    className="w-full bg-slate-900/80 text-white font-mono font-medium border border-blue-500/30 rounded-lg p-3 text-sm focus:border-blue-400 focus:outline-none transition-colors shadow-inner appearance-none cursor-pointer"
                >
                    <option value="B200">NVIDIA B200 (Blackwell AI) • 250 Units</option>
                    <option value="H200">NVIDIA H200 (Advanced Gen AI) • 500 Units</option>
                    <option value="H100">NVIDIA H100 (High-End Gen AI) • 1,000 Units</option>
                    <option value="A100">NVIDIA A100 (Legacy Training) • 2,500 Units</option>
                    <option value="L40S">NVIDIA L40S (Inference/Graphics) • 5,000 Units</option>
                    <option value="V100">NVIDIA V100 (Budget Compute) • 8,000 Units</option>
                    <option value="RTX4090">NVIDIA RTX 4090 (Consumer GPU) • 15,000 Units</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
            
            <div className="flex gap-4 p-3 bg-black/20 rounded-lg border border-white/5 relative z-10">
                <div className="flex-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Amortized CAPEX</p>
                    <p className="font-mono text-sm text-blue-300 flex items-center gap-1">
                        ${envSettings.depreciation_cost.toFixed(2)}<span className="text-slate-500 text-[10px]">/hr</span>
                    </p>
                </div>
                <div className="w-px bg-slate-700/50"></div>
                <div className="flex-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Power OPEX</p>
                    <p className="font-mono text-sm text-blue-300 flex items-center gap-1">
                        ${envSettings.power_opex.toFixed(2)}<span className="text-slate-500 text-[10px]">/hr</span>
                    </p>
                </div>
            </div>

            <button 
                onClick={handleEnvSave}
                disabled={envSaving || envSaved}
                className={`w-full py-3 mt-1 rounded-lg font-bold text-[13px] tracking-wide uppercase transition-all duration-300 shadow-lg relative z-10 ${envSaved ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'}`}
            >
                {envSaving ? 'Syncing...' : envSaved ? 'Portfolio Assigned' : 'Deploy Hardware Selection'}
            </button>
        </div>

        {/* Market Conditions Panel */}
        <div className="glass-panel p-6 flex flex-col gap-5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[50px] -mr-16 -mt-16 pointer-events-none transition-colors duration-1000 ${activeEvent === 'demand_spike' ? 'bg-orange-500/20' : activeEvent === 'market_slump' ? 'bg-cyan-500/20' : 'bg-emerald-500/10'}`}></div>
            
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 relative z-10">
                <span className="bg-slate-800/80 p-1.5 rounded-lg border border-white/5 shadow-inner">
                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                </span>
                Executive Wargames
            </h3>
            
            <p className="text-xs text-slate-400 mb-1 relative z-10 leading-relaxed font-medium">Inject sudden macro-economic scenarios to stress-test your AI pricing agents under extreme conditions.</p>
            
            <div className="flex flex-col gap-3 relative z-10 mt-1">
                
                <button 
                    onClick={() => triggerChaosEvent('predictable')}
                    className={`w-full p-4 rounded-xl flex items-start gap-3 transition-all duration-300 border group/btn ${activeEvent === 'predictable' ? 'bg-slate-800/80 border-slate-500 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)]' : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}`}
                >
                    <div className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0 transition-all ${activeEvent === 'predictable' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-slate-600 group-hover/btn:bg-slate-500'}`}></div>
                    <div className="flex flex-col text-left">
                        <span className="font-bold tracking-wide uppercase text-[11px] mb-1">Standard Market Protocol</span>
                        <span className={`text-[13px] leading-snug font-medium ${activeEvent === 'predictable' ? 'text-slate-200' : 'text-slate-500'}`}>Restore natural stochastic demand simulation flow.</span>
                    </div>
                </button>

                <div className="w-full h-px bg-white/5 my-1"></div>

                <button 
                    onClick={() => triggerChaosEvent('demand_spike')}
                    className={`w-full p-4 rounded-xl flex items-start gap-3 transition-all duration-300 border relative overflow-hidden group/btn ${activeEvent === 'demand_spike' ? 'bg-gradient-to-br from-orange-900/40 to-slate-900/80 border-orange-500 shadow-[0_4px_25px_rgba(249,115,22,0.25)]' : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-orange-500/50'}`}
                >
                    {activeEvent === 'demand_spike' && <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>}
                    <div className="mt-0.5 bg-orange-500/20 p-1.5 rounded shadow-inner flex-shrink-0">
                        <svg className={`w-4 h-4 ${activeEvent === 'demand_spike' ? 'text-orange-400' : 'text-slate-500 group-hover/btn:text-orange-500/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className={`font-bold tracking-wide uppercase text-[11px] mb-1 ${activeEvent === 'demand_spike' ? 'text-orange-300' : 'text-slate-400 group-hover/btn:text-orange-400/80'}`}>Inject Market Scarcity</span>
                        <span className={`text-[13px] leading-snug font-medium ${activeEvent === 'demand_spike' ? 'text-slate-200' : 'text-slate-500'}`}>Eradicate inventory. Force the <span className="text-orange-400 font-bold">Growth Agent</span> to exploit scarcity via surge pricing.</span>
                    </div>
                </button>
                
                <button 
                    onClick={() => triggerChaosEvent('market_slump')}
                    className={`w-full p-4 rounded-xl flex items-start gap-3 transition-all duration-300 border relative overflow-hidden group/btn ${activeEvent === 'market_slump' ? 'bg-gradient-to-br from-cyan-900/30 to-slate-900/80 border-cyan-500 shadow-[0_4px_25px_rgba(6,182,212,0.25)]' : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-cyan-500/50'}`}
                >
                    {activeEvent === 'market_slump' && <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>}
                    <div className="mt-0.5 bg-cyan-500/20 p-1.5 rounded shadow-inner flex-shrink-0">
                        <svg className={`w-4 h-4 ${activeEvent === 'market_slump' ? 'text-cyan-400' : 'text-slate-500 group-hover/btn:text-cyan-500/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className={`font-bold tracking-wide uppercase text-[11px] mb-1 ${activeEvent === 'market_slump' ? 'text-cyan-300' : 'text-slate-400 group-hover/btn:text-cyan-400/80'}`}>Inject Supply Glut</span>
                        <span className={`text-[13px] leading-snug font-medium ${activeEvent === 'market_slump' ? 'text-slate-200' : 'text-slate-500'}`}>Flood inventory. Test the <span className="text-cyan-400 font-bold">Risk Agent's</span> capability to defend min-margin floors.</span>
                    </div>
                </button>
            </div>
        </div>
    </div>
    );
};

export default PolicyControls;
