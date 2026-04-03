import React, { useState, useEffect } from 'react';

// Read the same group ID used by App.jsx so all API calls stay consistent.
const GROUP_ID = new URLSearchParams(window.location.search).get('group') || 'default';

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

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [settingsRes, envRes] = await Promise.all([
                    fetch(`/api/settings?group_id=${GROUP_ID}`),
                    fetch(`/api/environment?group_id=${GROUP_ID}`)
                ]);

                if (settingsRes.ok) {
                    const data = await settingsRes.json();
                    
                    // Parse backend strings ("15%", "$1.50") back into range values
                    const parsed = {
                        min_margin: data.min_margin.replace('%', ''),
                        scarcity_threshold: data.scarcity_threshold,
                        scarcity_multiplier: data.scarcity_multiplier,
                        max_market_premium: data.max_market_premium.replace('%', ''),
                        eviction_delta: data.eviction_delta.replace('$', ''),
                        post_roi_discount_floor: data.post_roi_discount_floor.replace('%', '')
                    };
                    setSettings(parsed);
                }

                if (envRes.ok) {
                    const envData = await envRes.json();
                    setEnvSettings(envData);
                }
            } catch (err) {
                console.error("Failed to rehydrate policy settings", err);
            }
        };

        fetchSettings();
    }, []);

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
            
            await fetch(`/api/settings?group_id=${GROUP_ID}`, {
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
            await fetch(`/api/environment?group_id=${GROUP_ID}`, {
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

    return (
        <div className="flex flex-col gap-8 animate-fade-in w-full max-w-4xl mx-auto">
            {/* Instructional Banner */}
            <div className="glass-panel p-6 border-l-4 border-l-accent-500/60">
                <div className="flex items-start gap-4">
                    <div className="bg-accent-500/20 p-2.5 rounded-xl border border-accent-500/30 shrink-0 mt-0.5">
                        <svg className="w-6 h-6 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg mb-1 font-display">Configure Your Pricing Strategy</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Set the policy rules that govern your AI agents, then choose your GPU fleet. 
                            When ready, click <span className="text-primary-400 font-bold">"Deploy"</span> and switch to the <span className="text-primary-400 font-bold">Simulation</span> tab to see how your agents perform.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                {/* Policy Sandbox */}
                <div className="flex-1">
                    <div className="glass-panel p-6 flex flex-col gap-5">
                        <h3 className="text-xl font-display font-bold text-white mb-1 flex items-center gap-3">
                            <div className="bg-accent-500/20 p-2 rounded-xl border border-accent-500/30">
                                <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
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
                            className={`w-full py-3 mt-2 rounded-lg font-bold text-sm transition-all duration-300 shadow-lg ${saved ? 'bg-green-600/90 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]'}`}
                        >
                            {saving ? 'Syncing...' : saved ? '✓ Policy Live!' : 'Deploy New Policies'}
                        </button>
                    </div>
                </div>

                {/* Hardware Portfolio */}
                <div className="w-full xl:w-[380px] shrink-0">
                    <div className="glass-panel p-6 flex flex-col gap-4 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                        <h3 className="text-xl font-display font-bold text-white mb-2 flex items-center gap-3 relative z-10">
                            <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
                                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
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
                            {envSaving ? 'Syncing...' : envSaved ? '✓ Portfolio Assigned' : 'Deploy Hardware Selection'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolicyControls;
