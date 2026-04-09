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
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settingsRes = await fetch(`/api/settings?group_id=${GROUP_ID}`);

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
                            <p className="text-xs text-slate-500 mt-2">Inventory level indicating high scarcity, enabling aggressive multipliers.</p>
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
                
                {/* Policy Framework / Handbook */}
                <div className="flex-1">
                    <div className="glass-panel p-6 flex flex-col gap-5 h-full">
                        <h3 className="text-xl font-display font-bold text-white mb-2 flex items-center gap-3">
                            <div className="bg-slate-800 p-2 rounded-xl border border-slate-600">
                                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            Policy Handbook
                        </h3>
                        <div className="flex flex-col gap-3">
                            {[
                                { name: 'Policy A', title: 'Margin Floor', color: 'text-violet-400', bg: 'bg-violet-500/10', desc: 'Sets a hard lower limit below which no automatic deal can be signed, protecting baseline profitability.' },
                                { name: 'Policy B', title: 'Scarcity Surge', color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Allows the agent to aggressively mark up prices as available hardware becomes severely constrained.' },
                                { name: 'Policy C', title: 'Strategic Preemption', color: 'text-purple-400', bg: 'bg-purple-500/10', desc: 'Permits executing forced evictions of active low-paying Spot users to make room for high-paying On-Demand clients if the math is favorable.' },
                                { name: 'Policy D', title: 'Lifecycle Aggression', color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Unlocks deeper, aggressive spot discounts specifically for older hardware models that have fully amortized their CapEx.' },
                                { name: 'Policy E', title: 'Market Cap', color: 'text-pink-400', bg: 'bg-pink-500/10', desc: 'Limits aggressive surging by imposing a functional ceiling tied directly to what Competitors are charging.' },
                            ].map((pol, i) => (
                                <div key={i} className="p-3 rounded-lg border border-slate-700/50 bg-slate-900/50 hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider">{pol.name}</span>
                                        <span className={`text-[11px] font-bold ${pol.color} ${pol.bg} px-1.5 py-0.5 rounded`}>{pol.title}</span>
                                    </div>
                                    <p className="text-slate-400 text-xs leading-relaxed">{pol.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolicyControls;
