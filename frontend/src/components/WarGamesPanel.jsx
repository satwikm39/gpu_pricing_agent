import React, { useState, useEffect } from 'react';
import { POLICY_DATA } from '../shared/policyData';

const WarGamesPanel = ({ savedRuns, onClearRuns, onRunScenario }) => {
    const [scenarios, setScenarios] = useState([]);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const fetchScenarios = async () => {
            try {
                const res = await fetch(`/api/scenarios/all`);
                if (res.ok) {
                    const data = await res.json();
                    setScenarios(data);
                } else {
                    setLoadError(true);
                }
            } catch (err) {
                console.error("Failed to fetch scenarios", err);
                setLoadError(true);
            }
        };
        fetchScenarios();
    }, []);

    return (
        <div className="flex flex-col gap-8 sm:gap-10 w-full max-w-6xl mx-auto pb-12 animate-fade-in">
            <div className="panel p-4 sm:p-6">
                <h3 className="text-white font-bold text-base sm:text-lg mb-1 font-display">Scenario Sandbox</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
                    Select a scenario to inject into the simulation. These are mathematical tests designed to pressure-test specific Agent Policies.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 items-start">
                <div className="xl:col-span-2 panel p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-display font-bold text-white mb-4 sm:mb-6">Library</h3>
                    
                    {loadError ? (
                        <div className="py-12 text-center text-red-400 text-sm flex flex-col items-center gap-3">
                            <p>Failed to load scenarios.</p>
                            <button onClick={() => window.location.reload()} className="min-h-[44px] px-4 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-medium transition-colors">
                                Retry
                            </button>
                        </div>
                    ) : scenarios.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
                            <svg className="w-8 h-8 text-slate-600 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p>Loading scenarios...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {scenarios.map((s, idx) => (
                                <div key={idx} className="bg-slate-800/40 rounded-lg border border-slate-700/40 transition-colors hover:bg-slate-800/60 hover:border-purple-500/20 flex flex-col h-full overflow-hidden group">
                                    <div className="p-3 sm:p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <h4 className="font-semibold text-white text-sm leading-tight group-hover:text-purple-400 transition-colors">{s.name}</h4>
                                            <span className="bg-slate-900/60 text-slate-500 text-xs font-mono px-2 py-0.5 rounded border border-slate-700/30 shrink-0 tabular-nums">#{s.id.toString().padStart(2, '0')}</span>
                                        </div>
                                        <p className="text-slate-400 text-sm leading-relaxed mb-3 flex-1">{s.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => onRunScenario(s.request, s.gpu_state)}
                                        className="min-h-[44px] w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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

                <div className="panel p-4 sm:p-6 sticky top-6">
                    <h3 className="text-base sm:text-lg font-display font-bold text-white mb-4 sm:mb-6">Policy Framework</h3>

                    <div className="flex flex-col gap-3 sm:gap-4">
                        {POLICY_DATA.map((pol, i) => (
                            <div key={i} className="p-3 rounded-lg border border-slate-700/40 bg-slate-800/40">
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

            {savedRuns.length > 0 && (
                <div className="panel p-4 sm:p-6 mt-4 sm:mt-8">
                    <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
                        <h2 className="text-base sm:text-lg font-display font-bold text-white">Run History</h2>
                        <button onClick={onClearRuns} className="min-h-[40px] text-xs border border-red-500/20 text-red-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600">
                            Clear
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                        {savedRuns.map((run, idx) => (
                            <div key={idx} className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                                <h3 className="text-sm font-semibold text-white flex justify-between items-center gap-2">
                                    <span className="truncate">{run.name}</span>
                                    <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 shrink-0 tabular-nums">ROI: {run.metrics.roi_percentage.toFixed(1)}%</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-900/50 rounded-lg p-2.5 sm:p-3 border border-slate-700/30">
                                        <p className="text-xs text-slate-500 mb-1">Revenue</p>
                                        <p className="text-primary-400 font-mono font-bold text-sm tabular-nums">${run.metrics.total_revenue.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-2.5 sm:p-3 border border-slate-700/30">
                                        <p className="text-xs text-slate-500 mb-1">Trust</p>
                                        <p className={`${run.metrics.trust_score >= 80 ? 'text-green-400' : run.metrics.trust_score >= 50 ? 'text-yellow-400' : 'text-red-400'} font-mono font-bold text-sm tabular-nums`}>{run.metrics.trust_score.toFixed(1)}</p>
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
