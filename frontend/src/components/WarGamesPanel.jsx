import React, { useState, useEffect } from 'react';

const WarGamesPanel = ({ savedRuns, onClearRuns, onSaveRun, canSave, isAutoRunning, onRunScenario }) => {
    const [scenarios, setScenarios] = useState([]);

    useEffect(() => {
        const fetchScenarios = async () => {
            try {
                const res = await fetch(`/api/scenarios/all`);
                if (res.ok) {
                    const data = await res.json();
                    setScenarios(data);
                }
            } catch (err) {
                console.error("Failed to fetch scenarios", err);
            }
        };
        fetchScenarios();
    }, []);

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto pb-12 animate-fade-in">
            {/* Instructional Banner */}
            <div className="glass-panel p-6 border-l-4 border-l-purple-500/60 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[60px] -mr-32 -mt-32 pointer-events-none"></div>
                <div className="flex items-start gap-4 relative z-10">
                    <div className="bg-purple-500/20 p-2.5 rounded-xl border border-purple-500/30 shrink-0 mt-0.5">
                        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg mb-1 font-display">Scenario Sandbox & Developer Library</h3>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
                            Select a scenario from the library below to immediately inject it into the live simulation environment. 
                            These are explicit mathematical tests designed to pressure-test specific Agent Policies.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                {/* Scenario List (Takes up 2/3 space) */}
                <div className="xl:col-span-2 glass-panel p-6">
                    <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-3">
                        <span className="bg-slate-800/80 p-2 rounded-xl border border-white/5 shadow-inner">
                            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </span>
                        Library Scenarios
                    </h3>
                    
                    {scenarios.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 italic text-sm">Loading scenarios from server...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {scenarios.map((s, idx) => (
                                <div key={idx} className="bg-slate-900/40 rounded-xl border border-slate-800 transition-colors hover:bg-slate-800/60 hover:border-purple-500/50 flex flex-col h-full overflow-hidden group">
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-white text-[15px] leading-tight group-hover:text-purple-400 transition-colors">{s.name}</h4>
                                            <span className="bg-black/30 text-slate-500 text-[10px] font-mono px-2 py-0.5 rounded border border-white/5 shrink-0">#{s.id.toString().padStart(2, '0')}</span>
                                        </div>
                                        <p className="text-slate-400 text-[13px] leading-relaxed mb-3 flex-1">{s.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => onRunScenario(s.request, s.gpu_state)}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 text-[13px] tracking-wide uppercase transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Run Context
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Policy Dictionary */}
                <div className="glass-panel p-6 sticky top-6">
                    <h3 className="text-lg font-display font-bold text-white flex items-center gap-3 mb-6">
                        <span className="bg-slate-800/80 p-2 rounded-xl border border-white/5 shadow-inner">
                            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </span>
                        Policy Framework
                    </h3>

                    <div className="flex flex-col gap-4">
                        {[
                            { name: 'Policy A', title: 'Margin Floor', color: 'text-accent-400', bg: 'bg-accent-500/10', desc: 'Sets the absolute lowest permitted bid threshold based on underlying hardware OPEX/CAPEX + min_margin.' },
                            { name: 'Policy B', title: 'Scarcity Yield', color: 'text-red-400', bg: 'bg-red-500/10', desc: 'Applies rigorous price surging dynamically when active available capacity falls below the scarcity_threshold.' },
                            { name: 'Policy C', title: 'Strategic Preemption', color: 'text-purple-400', bg: 'bg-purple-500/10', desc: 'Mandates eviction of existing low-revenue Spot instances if a high-paying incoming On-Demand Delta exceeds the threshold.' },
                            { name: 'Policy D', title: 'Lifecycle Aggression', color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Authorizes deep Spot discounting (up to the discount floor) exclusively for instances whose capital infrastructure costs are fully paid off.' },
                            { name: 'Policy E', title: 'Market Cap', color: 'text-pink-400', bg: 'bg-pink-500/10', desc: 'Limits aggressive surging by imposing a functional ceiling tied directly to what Competitors are charging.' },
                        ].map((pol, i) => (
                            <div key={i} className="p-3 rounded-lg border border-slate-700/50 bg-slate-900/50">
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

            {/* Saved Runs Section */}
            {savedRuns.length > 0 && (
                <div className="glass-panel p-6 mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-display font-bold text-white flex items-center gap-3">
                            <span className="bg-slate-800/80 p-2 rounded-xl border border-white/5 shadow-inner">
                                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </span>
                            Run History
                        </h2>
                        <button onClick={onClearRuns} className="text-sm border border-red-500/30 text-red-400 hover:text-white transition-colors flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-red-500">
                            Clear History
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {savedRuns.map((run, idx) => (
                            <div key={idx} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 shadow-xl flex flex-col gap-4">
                                <h3 className="text-[15px] font-bold text-white flex justify-between items-center">
                                    {run.name}
                                    <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/30">ROI: {run.metrics.roi_percentage.toFixed(1)}%</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Rev</p>
                                        <p className="text-blue-400 font-mono font-bold text-[15px]">${run.metrics.total_revenue.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Trust Score</p>
                                        <p className={`${run.metrics.trust_score >= 80 ? 'text-green-400' : run.metrics.trust_score >= 50 ? 'text-yellow-400' : 'text-red-400'} font-mono font-bold text-[15px]`}>{run.metrics.trust_score.toFixed(1)}</p>
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
