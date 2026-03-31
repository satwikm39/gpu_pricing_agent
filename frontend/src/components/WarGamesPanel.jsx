import React, { useState, useEffect } from 'react';

const GROUP_ID = new URLSearchParams(window.location.search).get('group') || 'default';

const WarGamesPanel = ({ savedRuns, onClearRuns, onSaveRun, canSave, isAutoRunning }) => {
    const [activeEvent, setActiveEvent] = useState('predictable');
    const [activePolicies, setActivePolicies] = useState(null);

    // Fetch current active policies for read-only display
    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                const res = await fetch(`/api/settings?group_id=${GROUP_ID}`);
                if (res.ok) {
                    const data = await res.json();
                    setActivePolicies(data);
                }
            } catch (err) {
                console.error('Failed to fetch policies', err);
            }
        };
        fetchPolicies();
        const interval = setInterval(fetchPolicies, 60000);
        return () => clearInterval(interval);
    }, []);

    const triggerChaosEvent = async (scenario) => {
        setActiveEvent(scenario);
        try {
            await fetch(`/api/chaos/event?group_id=${GROUP_ID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario })
            });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in w-full max-w-5xl mx-auto">
            {/* Instructional Banner */}
            <div className="glass-panel p-6 border-l-4 border-l-amber-500/60">
                <div className="flex items-start gap-4">
                    <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30 shrink-0 mt-0.5">
                        <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg mb-1 font-display">Stress-Test Your Strategy</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Inject sudden market shocks to see how your AI agents respond under extreme conditions. 
                            Select a scenario below, then switch to the <span className="text-primary-400 font-bold">Simulation</span> tab to watch the impact unfold in real time.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                {/* Left: Scenario Selector */}
                <div className="flex-1">
                    <div className="glass-panel p-6 flex flex-col gap-5 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[50px] -mr-16 -mt-16 pointer-events-none transition-colors duration-1000 ${activeEvent === 'demand_spike' ? 'bg-orange-500/20' : activeEvent === 'market_slump' ? 'bg-cyan-500/20' : 'bg-emerald-500/10'}`}></div>
                        
                        <h3 className="text-xl font-display font-bold text-white flex items-center gap-3 relative z-10">
                            <span className="bg-slate-800/80 p-2 rounded-xl border border-white/5 shadow-inner">
                                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </span>
                            Market Scenarios
                        </h3>

                        <div className="flex flex-col gap-3 relative z-10 mt-1">
                            <button 
                                onClick={() => triggerChaosEvent('predictable')}
                                className={`w-full p-5 rounded-xl flex items-start gap-4 transition-all duration-300 border group/btn ${activeEvent === 'predictable' ? 'bg-slate-800/80 border-slate-500 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)]' : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}`}
                            >
                                <div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all ${activeEvent === 'predictable' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-slate-600 group-hover/btn:bg-slate-500'}`}></div>
                                <div className="flex flex-col text-left">
                                    <span className="font-bold tracking-wide uppercase text-[12px] mb-1">Standard Market Protocol</span>
                                    <span className={`text-sm leading-snug font-medium ${activeEvent === 'predictable' ? 'text-slate-200' : 'text-slate-500'}`}>Restore natural stochastic demand simulation flow. Balanced mix of On-Demand and Spot requests.</span>
                                </div>
                            </button>

                            <div className="w-full h-px bg-white/5 my-1"></div>

                            <button 
                                onClick={() => triggerChaosEvent('demand_spike')}
                                className={`w-full p-5 rounded-xl flex items-start gap-4 transition-all duration-300 border relative overflow-hidden group/btn ${activeEvent === 'demand_spike' ? 'bg-gradient-to-br from-orange-900/40 to-slate-900/80 border-orange-500 shadow-[0_4px_25px_rgba(249,115,22,0.25)]' : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-orange-500/50'}`}
                            >
                                {activeEvent === 'demand_spike' && <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>}
                                <div className="mt-0.5 bg-orange-500/20 p-2 rounded-lg shadow-inner flex-shrink-0">
                                    <svg className={`w-5 h-5 ${activeEvent === 'demand_spike' ? 'text-orange-400' : 'text-slate-500 group-hover/btn:text-orange-500/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className={`font-bold tracking-wide uppercase text-[12px] mb-1 ${activeEvent === 'demand_spike' ? 'text-orange-300' : 'text-slate-400 group-hover/btn:text-orange-400/80'}`}>Inject Market Scarcity</span>
                                    <span className={`text-sm leading-snug font-medium ${activeEvent === 'demand_spike' ? 'text-slate-200' : 'text-slate-500'}`}>Eradicate inventory. Force the <span className="text-orange-400 font-bold">Growth Agent</span> to exploit scarcity via surge pricing.</span>
                                </div>
                            </button>
                            
                            <button 
                                onClick={() => triggerChaosEvent('market_slump')}
                                className={`w-full p-5 rounded-xl flex items-start gap-4 transition-all duration-300 border relative overflow-hidden group/btn ${activeEvent === 'market_slump' ? 'bg-gradient-to-br from-cyan-900/30 to-slate-900/80 border-cyan-500 shadow-[0_4px_25px_rgba(6,182,212,0.25)]' : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-cyan-500/50'}`}
                            >
                                {activeEvent === 'market_slump' && <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>}
                                <div className="mt-0.5 bg-cyan-500/20 p-2 rounded-lg shadow-inner flex-shrink-0">
                                    <svg className={`w-5 h-5 ${activeEvent === 'market_slump' ? 'text-cyan-400' : 'text-slate-500 group-hover/btn:text-cyan-500/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className={`font-bold tracking-wide uppercase text-[12px] mb-1 ${activeEvent === 'market_slump' ? 'text-cyan-300' : 'text-slate-400 group-hover/btn:text-cyan-400/80'}`}>Inject Supply Glut</span>
                                    <span className={`text-sm leading-snug font-medium ${activeEvent === 'market_slump' ? 'text-slate-200' : 'text-slate-500'}`}>Flood inventory. Test the <span className="text-cyan-400 font-bold">Risk Agent's</span> capability to defend min-margin floors.</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Active Policies Summary (read-only) */}
                <div className="w-full xl:w-[340px] shrink-0">
                    <div className="glass-panel p-6 flex flex-col gap-4">
                        <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Active Policies
                        </h3>
                        <p className="text-xs text-slate-500 -mt-2">Read-only — edit on the <span className="text-accent-400 font-bold">Policy</span> tab.</p>
                        
                        {activePolicies ? (
                            <div className="flex flex-col gap-3">
                                {[
                                    { label: 'Min Margin Floor', value: activePolicies.min_margin || '15%', color: 'accent' },
                                    { label: 'Scarcity Threshold', value: `< ${activePolicies.scarcity_threshold || '10'}%`, color: 'red' },
                                    { label: 'Scarcity Multiplier', value: `${activePolicies.scarcity_multiplier || '3.0'}x`, color: 'yellow' },
                                    { label: 'Max Market Premium', value: activePolicies.max_market_premium || '20%', color: 'pink' },
                                    { label: 'Eviction Delta', value: activePolicies.eviction_delta || '$1.50', color: 'purple' },
                                    { label: 'Post-ROI Discount', value: activePolicies.post_roi_discount_floor || '50%', color: 'blue' },
                                ].map((p, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                                        <span className="text-xs text-slate-400 font-medium">{p.label}</span>
                                        <span className={`text-${p.color}-400 font-mono font-bold text-sm bg-${p.color}-500/10 px-2 py-0.5 rounded`}>{p.value}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-slate-500 text-sm italic py-4 text-center">Loading policies...</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Saved Runs Section */}
            {savedRuns.length > 0 && (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                            <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Scenario Comparisons
                        </h2>
                        <button onClick={onClearRuns} className="text-sm text-red-500 hover:text-red-400 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-500/10">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {savedRuns.map((run, idx) => (
                            <div key={idx} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden group">
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                <h3 className="text-lg font-bold text-white flex justify-between items-center">
                                    {run.name}
                                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30">ROI: {run.metrics.roi_percentage.toFixed(1)}%</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Rev</p>
                                        <p className="text-blue-400 font-mono font-bold text-lg">${run.metrics.total_revenue.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Trust Score</p>
                                        <p className={`${run.metrics.trust_score >= 80 ? 'text-green-400' : run.metrics.trust_score >= 50 ? 'text-yellow-400' : 'text-red-400'} font-mono font-bold text-lg`}>{run.metrics.trust_score.toFixed(1)}/100</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Evicted</p>
                                        <p className="text-orange-400 font-mono font-bold text-lg">{run.metrics.evictions}</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Rejected</p>
                                        <p className="text-red-400 font-mono font-bold text-lg">{run.metrics.rejected_deals}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarGamesPanel;
