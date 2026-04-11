import React, { useState, useEffect } from 'react';
import { POLICY_DATA } from '../shared/policyData';

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

    const POLICY_SLIDERS = [
        { name: 'min_margin', label: 'Min Margin Floor (%)', min: 0, max: 50, step: 1, valueColor: 'text-accent-400', valueBg: 'bg-accent-500/8', display: v => `${v}%`, hint: 'Prevents AI from executing deals below fixed costs + margin protection.' },
        { name: 'scarcity_threshold', label: 'Scarcity Threshold (%)', min: 5, max: 30, step: 1, valueColor: 'text-red-400', valueBg: 'bg-red-500/8', display: v => `< ${v}%`, hint: 'Inventory level indicating high scarcity, enabling aggressive multipliers.' },
        { name: 'scarcity_multiplier', label: 'Scarcity Multiplier (x)', min: 1.0, max: 5.0, step: 0.1, valueColor: 'text-yellow-400', valueBg: 'bg-yellow-500/8', display: v => `${v}x`, hint: 'Price surge when available inventory drops below threshold.' },
    ];

    const ADVANCED_SLIDERS = [
        { name: 'max_market_premium', label: 'Max Market Premium (%)', min: 0, max: 100, step: 5, valueColor: 'text-pink-400', valueBg: 'bg-pink-500/8', display: v => `${v}%`, hint: null, hintPair: ['Matches Competitor', '100% markup allowed'] },
        { name: 'eviction_delta', label: 'Eviction Delta ($)', min: 0.10, max: 5.00, step: 0.10, valueColor: 'text-purple-400', valueBg: 'bg-purple-500/8', display: v => `$${v}`, hint: 'Min. gap to kick Spot user for On-Demand' },
        { name: 'post_roi_discount_floor', label: 'Post-ROI Spot Discount (%)', min: 0, max: 100, step: 5, valueColor: 'text-primary-400', valueBg: 'bg-primary-500/8', display: v => `${v}%`, hint: 'Max spot discount on Paid-Off cards (bypasses Margin Floor)' },
    ];

    const renderSlider = (s) => (
        <div key={s.name}>
            <div className="flex justify-between text-sm mb-1.5">
                <label htmlFor={`policy-${s.name}`} className="text-slate-300 font-medium text-xs sm:text-sm">{s.label}</label>
                <span className={`${s.valueColor} font-mono ${s.valueBg} px-2 py-0.5 rounded text-xs sm:text-sm`}>{s.display(settings[s.name])}</span>
            </div>
            <input 
                id={`policy-${s.name}`}
                type="range" 
                name={s.name}
                min={s.min}
                max={s.max}
                step={s.step}
                value={settings[s.name]}
                onChange={handleChange}
                className="w-full h-2 bg-slate-700 rounded-lg cursor-pointer"
            />
            {s.hint && <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5">{s.hint}</p>}
            {s.hintPair && (
                <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                    <span>{s.hintPair[0]}</span>
                    <span>{s.hintPair[1]}</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in w-full max-w-4xl mx-auto">
            <div className="panel p-4 sm:p-6 border-l-2 border-l-accent-500/40">
                <div className="flex items-start gap-3 sm:gap-4">
                    <div className="bg-accent-500/10 p-2 sm:p-2.5 rounded-lg border border-accent-500/20 shrink-0 mt-0.5">
                        <svg className="w-5 sm:w-6 h-5 sm:h-6 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base sm:text-lg mb-1 font-display">Configure Your Pricing Strategy</h3>
                        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                            Set the policy rules that govern your AI agents. 
                            Click <span className="text-primary-400 font-semibold">"Deploy"</span> then switch to <span className="text-primary-400 font-semibold">Simulation</span>.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                <div className="flex-1">
                    <div className="panel p-4 sm:p-6 flex flex-col gap-5">
                        <h3 className="text-base sm:text-lg font-display font-bold text-white mb-1 flex items-center gap-3">
                            <div className="bg-accent-500/10 p-2 rounded-lg border border-accent-500/20">
                                <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            Policy Sandbox
                        </h3>

                        {POLICY_SLIDERS.map(renderSlider)}

                        <div className="pt-2 border-t border-slate-700/40 flex flex-col gap-5">
                            {ADVANCED_SLIDERS.map(renderSlider)}
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={saving || saved}
                            className={`min-h-[44px] w-full py-3 mt-2 rounded-lg font-bold text-sm transition-colors ${saved ? 'bg-green-600/80 text-white' : 'bg-accent-600 hover:bg-accent-500 text-white'}`}
                        >
                            {saving ? 'Syncing...' : saved ? '✓ Policy Live!' : 'Deploy New Policies'}
                        </button>
                    </div>
                </div>
                
                <div className="flex-1">
                    <div className="panel p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 h-full">
                        <h3 className="text-base sm:text-lg font-display font-bold text-white mb-1 sm:mb-2 flex items-center gap-3">
                            <div className="bg-slate-800 p-2 rounded-lg border border-slate-600">
                                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            Policy Handbook
                        </h3>
                        <div className="flex flex-col gap-3">
                            {POLICY_DATA.map((pol, i) => (
                                <div key={i} className="p-3 rounded-lg border border-slate-700/40 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider">Policy {pol.key}</span>
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
