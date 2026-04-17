import React, { useState, useEffect } from 'react';
import { POLICY_DATA } from '../shared/policyData';

const MarkdownRenderer = ({ markdown }) => {
    if (!markdown) return null;
    
    const lines = markdown.split('\n');
    let inList = false;
    let listItems = [];
    
    const elements = [];
    
    const flushList = () => {
        if (inList && listItems.length > 0) {
            elements.push(<ul key={`list-${elements.length}`} className="list-disc pl-5 mb-4 text-slate-300 space-y-2">{listItems.map((item, i) => <React.Fragment key={i}>{item}</React.Fragment>)}</ul>);
            listItems = [];
            inList = false;
        }
    };

    const parseInline = (text) => {
        const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i} className="text-slate-300 italic">{part.slice(1, -1)}</em>;
            }
            return part;
        });
    };

    lines.forEach((line, index) => {
        const tline = line.trim();
        if (tline.startsWith('### ')) {
            flushList();
            elements.push(<h3 key={`h3-${index}`} className="text-lg font-bold text-white mt-6 mb-3">{parseInline(tline.slice(4))}</h3>);
        } else if (tline.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={`h2-${index}`} className="text-xl font-bold text-white mt-6 mb-3">{parseInline(tline.slice(3))}</h2>);
        } else if (tline.startsWith('# ')) {
            flushList();
            elements.push(<h1 key={`h1-${index}`} className="text-2xl font-bold text-white mt-6 mb-3">{parseInline(tline.slice(2))}</h1>);
        } else if (tline.startsWith('* ') || tline.startsWith('- ')) {
            // Filter out N/A lines just in case the LLM still generates them
            if (/:\s*\**N\/A\**\s*$/i.test(tline) || tline.endsWith('N/A') || tline.endsWith('N/A.') || tline.toLowerCase().includes('not applicable')) {
                return;
            }
            
            let bulletContent = tline.slice(2).trim();
            // Remove lowercase letter list prefixes like "a) ", "b) ", "**a) ", etc. so the gaps aren't obvious
            bulletContent = bulletContent.replace(/^(?:\*\*)?[a-z]\)\s+/i, (match) => {
                return match.startsWith('**') ? '**' : '';
            });
            
            inList = true;
            listItems.push(<li key={`li-${index}`} className="leading-relaxed">{parseInline(bulletContent)}</li>);
        } else if (tline === '') {
            flushList();
        } else {
            flushList();
            elements.push(<p key={`p-${index}`} className="text-slate-300 mb-4 leading-relaxed">{parseInline(line)}</p>);
        }
    });
    flushList();
    
    return <div className="text-sm font-sans">{elements}</div>;
};

const GROUP_ID = new URLSearchParams(window.location.search).get('group') || 'default';

const PolicyControls = () => {
    const [originalSettings, setOriginalSettings] = useState(null);
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
    
    // New states for the Responsible AI critic
    const [critique, setCritique] = useState(null);
    const [isGettingCritique, setIsGettingCritique] = useState(false);
    const [showCritiqueModal, setShowCritiqueModal] = useState(false);

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
                    setOriginalSettings({
                        min_margin: data.min_margin,
                        scarcity_threshold: data.scarcity_threshold,
                        scarcity_multiplier: data.scarcity_multiplier,
                        max_market_premium: data.max_market_premium,
                        eviction_delta: data.eviction_delta,
                        post_roi_discount_floor: data.post_roi_discount_floor
                    });
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

    const formatSettings = (s) => ({
        min_margin: `${s.min_margin}%`,
        scarcity_threshold: s.scarcity_threshold,
        scarcity_multiplier: s.scarcity_multiplier,
        max_market_premium: `${s.max_market_premium}%`,
        eviction_delta: `$${s.eviction_delta}`,
        post_roi_discount_floor: `${s.post_roi_discount_floor}%`
    });

    const handleGetCritique = async () => {
        setIsGettingCritique(true);
        try {
            const currentFormatted = formatSettings(settings);
            
            const reqBody = {
                old_policies: originalSettings || formatSettings({ /* fallback if not loaded */
                    min_margin: '15',
                    scarcity_threshold: '10',
                    scarcity_multiplier: '3.0',
                    max_market_premium: '20',
                    eviction_delta: '1.50',
                    post_roi_discount_floor: '50'
                }),
                new_policies: currentFormatted
            };

            const response = await fetch('/api/policy_critique', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqBody)
            });
            const data = await response.json();
            setCritique(data.critique);
            setShowCritiqueModal(true);
        } catch (err) {
            console.error("Failed to get critique", err);
            // Fallback UI or simple error
            setCritique("Error: Could not evaluate policies. Proceeding with deployment.");
            setShowCritiqueModal(true);
        } finally {
            setIsGettingCritique(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = formatSettings(settings);
            
            await fetch(`/api/settings?group_id=${GROUP_ID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            // Update original settings so next critique uses these new baseline
            setOriginalSettings(payload);
            setSaved(true);
            setShowCritiqueModal(false);
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
            <div className="flex justify-between mb-1.5">
                <label htmlFor={`policy-${s.name}`} className="text-slate-300 text-sm">{s.label}</label>
                <span className={`${s.valueColor} font-mono tabular-nums ${s.valueBg} px-2 py-0.5 rounded text-sm`}>{s.display(settings[s.name])}</span>
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
            {s.hint && <p className="text-xs text-slate-500 mt-1.5">{s.hint}</p>}
            {s.hintPair && (
                <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>{s.hintPair[0]}</span>
                    <span>{s.hintPair[1]}</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col gap-8 sm:gap-10 animate-fade-in w-full max-w-4xl mx-auto">
            <div className="panel p-4 sm:p-6">
                <h3 className="text-white font-bold text-base sm:text-lg mb-1 font-display">Configure Your Pricing Strategy</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                    Set the policy rules that govern your AI agents. 
                    Click <span className="text-primary-400 font-medium">"Deploy"</span> then switch to <span className="text-primary-400 font-medium">Simulation</span>.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                <div className="flex-1">
                    <div className="panel p-4 sm:p-6 flex flex-col gap-6">
                        <h3 className="text-base sm:text-lg font-display font-bold text-white">Policy Sandbox</h3>

                        {POLICY_SLIDERS.map(renderSlider)}

                        <div className="pt-3 border-t border-slate-700/40 flex flex-col gap-6">
                            {ADVANCED_SLIDERS.map(renderSlider)}
                        </div>

                        <button 
                            onClick={handleGetCritique}
                            disabled={isGettingCritique || saved}
                            className={`min-h-[44px] w-full py-3 mt-2 rounded-lg font-medium text-sm transition-colors ${saved ? 'bg-green-600/80 text-white' : 'bg-accent-600 hover:bg-accent-500 text-white flex items-center justify-center gap-2'}`}
                        >
                            {isGettingCritique ? (
                                <>
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                    </span>
                                    Critiquing Policy...
                                </>
                            ) : saved ? '✓ Policy Live!' : 'Deploy New Policies'}
                        </button>
                        {isGettingCritique && (
                            <p className="text-center text-xs text-slate-500 mt-1 animate-fade-in">
                                This will take a few seconds...
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="flex-1">
                    <div className="panel p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 h-full">
                        <h3 className="text-base sm:text-lg font-display font-bold text-white">Policy Handbook</h3>
                        <div className="flex flex-col gap-3">
                            {POLICY_DATA.map((pol, i) => (
                                <div key={i} className="p-3 rounded-lg border border-slate-700/40 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono text-xs text-slate-500 tabular-nums">Policy {pol.key}</span>
                                        <span className={`text-xs font-medium ${pol.color} ${pol.bg} px-1.5 py-0.5 rounded`}>{pol.title}</span>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">{pol.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Critique Modal Overlay */}
            {showCritiqueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up relative">
                        <div className="p-5 sm:p-6 border-b border-slate-700/50 flex flex-col gap-2 shrink-0 bg-slate-800/50">
                            <h2 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2">
                                <span className="text-2xl" aria-hidden="true">🤖</span> Responsible AI Policy Critic
                            </h2>
                            <p className="text-slate-400 text-sm">Review the potential implications of your policy changes before deploying.</p>
                        </div>
                        
                        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                            <MarkdownRenderer markdown={critique} />
                        </div>
                        
                        <div className="p-4 sm:p-5 border-t border-slate-700/50 bg-slate-800/80 flex justify-end gap-3 shrink-0">
                            <button 
                                onClick={() => setShowCritiqueModal(false)}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                Back to Sandbox
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-accent-600 hover:bg-accent-500 text-white transition-colors min-w-[150px] flex items-center justify-center"
                            >
                                {saving ? "Deploying..." : "Approve & Deploy"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PolicyControls;
