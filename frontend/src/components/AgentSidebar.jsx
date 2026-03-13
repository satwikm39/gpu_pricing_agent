import React, { useRef, useState } from 'react';

const AGENT_SEQUENCE = [
    { node: 'pricing', name: 'Pricing Base Agent', icon: '💰' },
    { node: 'negative', name: 'Conservative Risk Agent', icon: '🛡️' },
    { node: 'positive', name: 'Opportunistic Growth Agent', icon: '🚀' },
    { node: 'market', name: 'Market Monitor Agent', icon: '📈' },
    { node: 'inventory', name: 'Capacity Agent', icon: '📦' },
    { node: 'judge', name: 'Supreme Judge', icon: '⚖️' }
];

const POLICY_SEQUENCE = [
    { node: 'analyst', name: 'Policy Analyst Agent', icon: '🧪' },
    { node: 'critique', name: 'Policy Critique Agent', icon: '📝' }
];

const ThoughtCard = ({ item }) => {
    const [expanded, setExpanded] = useState(false);
    const isJudge = item.node === 'judge';
    const isPolicy = ['analyst', 'critique'].includes(item.node);
    
    // Fallback to POLICY_SEQUENCE if not found in AGENT_SEQUENCE
    const iconObj = AGENT_SEQUENCE.find(a => a.node === item.node) || POLICY_SEQUENCE.find(a => a.node === item.node);
    const icon = iconObj?.icon || '🤖';
    
    const sentences = item.thought.content.split(/(?<=[.!?])\s+/);
    const summary = sentences[0];
    const rest = sentences.slice(1).join(' ');

    // Extract suggestion if present: [SUGGESTION: key=value]
    const suggestionMatch = item.thought.content.match(/\[SUGGESTION:\s*([^\]]+)\]/);
    const suggestion = suggestionMatch ? suggestionMatch[1] : null;

    // Extract capacity action if present: [CAPACITY_ACTION: action X UNITS]
    const capacityMatch = item.thought.content.match(/\[CAPACITY_ACTION:\s*([^\]]+)\]/);
    const capacityAction = capacityMatch ? capacityMatch[1] : null;

    let styleClass = 'glass-card border-white/5';
    let textClass = 'text-primary-400';
    if (isJudge) {
        styleClass = 'bg-accent-900/20 border-accent-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]';
        textClass = 'text-accent-400';
    } else if (isPolicy) {
        styleClass = 'bg-slate-800/40 border-slate-600 border-dashed';
        textClass = 'text-slate-400';
    }

    return (
        <div className={`p-5 animate-slide-up w-full ${styleClass}`}>
            <h3 className={`font-display font-bold text-xs tracking-[0.2em] uppercase mb-3 flex items-center gap-2 ${textClass}`}>
                <span className="text-lg bg-black/20 p-1.5 rounded-lg border border-white/5 shadow-inner">{icon}</span> 
                {item.thought.agent_name}
            </h3>
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans break-words">
                {suggestion && item.node === 'critique' && (
                    <div className="mb-4 px-3 py-2.5 bg-violet-500/10 border border-violet-500/30 rounded-xl flex items-start gap-3 animate-pulse-subtle">
                        <div className="bg-violet-500 p-1.5 rounded-lg shrink-0 mt-0.5 shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor font-bold">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Policy Suggestion</span>
                            <span className="text-sm font-mono font-bold text-white break-words leading-tight">
                                {suggestion}
                            </span>
                        </div>
                    </div>
                )}

                {capacityAction && (
                    <div className="mb-4 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 animate-pulse-subtle">
                        <div className="bg-emerald-500 p-1.5 rounded-lg shrink-0 mt-0.5 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor font-bold">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Capacity Recommendation</span>
                            <span className="text-sm font-mono font-bold text-white break-words leading-tight">
                                {capacityAction}
                            </span>
                        </div>
                    </div>
                )}
                <p className="font-medium text-slate-100">{summary}</p>
                {rest && (
                    <div className="mt-3">
                        {expanded && (
                            <div className="mt-3 text-slate-400 border-t border-white/10 pt-3 animate-fade-in text-[13px] leading-relaxed break-words">
                                {rest.replace(/\[(SUGGESTION|CAPACITY_ACTION):[^\]]+\]/g, '').trim()}
                            </div>
                        )}
                        <button 
                            onClick={() => setExpanded(!expanded)} 
                            className="text-xs text-primary-400 mt-2 hover:text-primary-300 transition-colors flex items-center gap-1.5 font-bold uppercase tracking-wider"
                        >
                            {expanded ? '▲ Hide Analysis' : '▼ Read Full Analysis'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const AgentSidebar = ({ streamData, isThinking, lastDealContext, onReplay, onViewComparison, hasComparison }) => {
    const endRef = useRef(null);
    const [replayOpen, setReplayOpen] = useState(false);
    const [replayPolicies, setReplayPolicies] = useState({
        min_margin: '15%',
        scarcity_threshold: '10',
        scarcity_multiplier: '3.0',
        max_market_premium: '20%',
        eviction_delta: '1.50',
        post_roi_discount_floor: '50%'
    });

    const thoughts = streamData.filter(d => d.type === 'thought');
    const dealThoughts = thoughts.filter(t => !['analyst', 'critique'].includes(t.node));
    const policyThoughts = thoughts.filter(t => ['analyst', 'critique'].includes(t.node));

    const initialContext = streamData.find(d => d.type === 'initial');
    const finalDecision = streamData.find(d => d.type === 'final_decision');
    
    let expectedNextAgent = null;
    let expectedNextPolicyAgent = null;

    if (dealThoughts.length < AGENT_SEQUENCE.length) {
        expectedNextAgent = AGENT_SEQUENCE[dealThoughts.length];
    } else if (policyThoughts.length < POLICY_SEQUENCE.length) {
        expectedNextPolicyAgent = POLICY_SEQUENCE[policyThoughts.length];
    }

    return (
        <div className="glass-panel w-full xl:w-[420px] 2xl:w-[480px] flex flex-col h-full overflow-hidden shrink-0 glow-top">
            <h2 className="text-xl font-display font-bold text-white flex items-center justify-between sticky top-0 bg-slate-900/60 px-6 py-5 backdrop-blur-xl z-20 border-b border-white/10 shadow-sm">
                <span className="flex items-center gap-3">
                    <div className="bg-primary-500/20 p-2 rounded-lg border border-primary-500/30">
                        <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    Agent Workflow
                </span>
                {/* Replay badge */}
                {streamData.some(d => d.is_replay) && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-violet-500/20 text-violet-300 border-violet-500/40 flex items-center gap-1.5 animate-pulse">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Policy Replay
                    </span>
                )}
            </h2>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 border-transparent relative">
                {/* Visual Pipeline Backbone Line */}
                {(streamData.length > 0 || isThinking) && (
                    <div className="absolute left-10 top-10 bottom-10 w-px bg-gradient-to-b from-primary-500/50 via-slate-600/30 to-transparent z-0"></div>
                )}

                {streamData.length === 0 && !isThinking ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-center px-4">
                        <div className="bg-slate-800/50 p-6 rounded-full border border-white/5 mb-6">
                            <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="font-semibold text-slate-400">Idle Pipeline</p>
                        <p className="text-sm mt-2 font-mono">Awaiting manual or auto tick execution.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 w-full z-10 relative mt-2">
                        {initialContext && (
                            <div className="bg-primary-900/10 border border-primary-500/20 rounded-xl p-5 animate-fade-in shadow-[0_4px_20px_rgba(0,0,0,0.2)] ml-8 relative">
                                <div className="absolute -left-[45px] top-4 border-2 border-primary-500/50 bg-slate-900 w-4 h-4 rounded-full z-10"></div>
                                <h3 className="text-primary-300 font-display font-bold text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Incoming Deal Context
                                </h3>
                                <div className="text-slate-300 text-sm font-mono flex flex-col gap-1.5 bg-black/20 p-3 rounded-lg border border-white/5">
                                    <p className="flex justify-between"><span className="text-slate-500">Request:</span> <span>{initialContext.request.quantity}x {initialContext.request.gpu_type} ({initialContext.request.duration_hours}h)</span></p>
                                    <p className="flex justify-between"><span className="text-slate-500">Avail:</span> <span>{initialContext.state.available_inventory} / {initialContext.state.total_inventory}</span></p>
                                    <p className="flex justify-between"><span className="text-slate-500">Comp ({initialContext.state.market_competitor_name}):</span> <span>${initialContext.state.market_price_per_hour.toFixed(2)}/hr</span></p>
                                </div>
                            </div>
                        )}
                        
                        {dealThoughts.map((item, idx) => (
                            <div key={idx} className="flex flex-col ml-8 relative">
                                <div className="absolute -left-[45px] top-6 border-[3px] border-slate-700 bg-slate-900 w-4 h-4 rounded-full z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
                                <ThoughtCard item={item} />
                            </div>
                        ))}
                        
                        {isThinking && expectedNextAgent && (
                            <div className="border border-white/5 bg-slate-800/20 rounded-xl p-5 animate-pulse ml-8 shadow-inner relative">
                                <div className="absolute -left-[45px] top-6 border-[3px] border-primary-500/50 bg-slate-900 w-4 h-4 rounded-full z-10 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                <h3 className="font-display font-bold text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-500"></span>
                                    </span>
                                    {expectedNextAgent.icon} {expectedNextAgent.name} executing...
                                </h3>
                            </div>
                        )}

                        {finalDecision && (
                            <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(16,185,129,0.1)] mt-2 animate-fade-in ml-8 relative glow-top">
                                <div className="absolute -left-[45px] top-6 border-[3px] border-emerald-500 bg-slate-900 w-4 h-4 rounded-full z-10 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                <h3 className="text-emerald-400 font-display font-bold text-sm tracking-[0.1em] mb-4 flex items-center gap-2 uppercase">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Final Executed Verdict
                                </h3>
                                <div className="text-sm">
                                    <p className="mb-1">
                                        <span className="text-slate-400">Action:</span> 
                                        <span className={`font-bold ml-2 ${finalDecision.decision.action === 'APPROVE' ? 'text-green-400' : finalDecision.decision.action === 'OVERRIDE' ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {finalDecision.decision.action}
                                        </span>
                                    </p>
                                    <p className="mb-1"><span className="text-slate-400">Final Price:</span> <span className="text-white font-bold ml-2">${finalDecision.decision.final_price_per_hour.toFixed(2)}/hr</span></p>
                                </div>
                            </div>
                        )}

                        {/* POST-MORTEM POLICY DIAGNOSTICS */}
                        {(finalDecision || policyThoughts.length > 0) && (
                            <div className="mt-6 border-t border-white/10 pt-8 relative">
                                <div className="absolute -top-[11px] left-0 bg-slate-950 pr-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-display flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    Post-Mortem Policy Review
                                </div>
                                <div className="flex flex-col gap-6 ml-8 relative mt-2">
                                    {policyThoughts.map((item, idx) => (
                                        <div key={idx} className="flex flex-col relative w-full">
                                            <div className="absolute -left-[45px] top-6 border-[3px] border-slate-700 bg-slate-900 w-4 h-4 rounded-full z-10"></div>
                                            <ThoughtCard item={item} />
                                        </div>
                                    ))}
                                    
                                    {isThinking && expectedNextPolicyAgent && (
                                        <div className="border border-white/5 border-dashed bg-slate-800/10 rounded-xl p-5 animate-pulse shadow-inner relative">
                                            <div className="absolute -left-[45px] top-6 border-[3px] border-slate-600/50 bg-slate-900 w-4 h-4 rounded-full z-10"></div>
                                            <h3 className="font-display font-bold text-xs uppercase tracking-[0.2em] text-slate-500 flex items-center gap-3">
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-500 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
                                                </span>
                                                {expectedNextPolicyAgent.icon} {expectedNextPolicyAgent.name} auditing...
                                            </h3>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                                    {/* POLICY RE-RUN TRIGGER — appears after deal completes */}
                        {finalDecision && lastDealContext && !isThinking && (
                            <div className="mt-6 relative z-10 flex flex-col gap-3">
                                {hasComparison && (
                                    <button
                                        onClick={onViewComparison}
                                        className="w-full py-4 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-[12px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] animate-slide-up"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        View Impact Comparison
                                    </button>
                                )}

                                {!replayOpen ? (
                                    <button
                                        onClick={() => setReplayOpen(true)}
                                        className="w-full py-3 px-4 rounded-xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-bold text-[12px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:shadow-[0_0_25px_rgba(139,92,246,0.2)]"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Re-Run with Different Policies
                                    </button>
                                ) : (
                                    <div className="rounded-xl border border-violet-500/40 bg-slate-900/80 overflow-hidden animate-fade-in shadow-[0_4px_30px_rgba(139,92,246,0.15)]">
                                        <div className="px-5 py-4 bg-violet-900/20 border-b border-violet-500/20 flex items-center justify-between">
                                            <span className="text-violet-300 font-bold text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                Policy Wargame — Replay
                                            </span>
                                            <button onClick={() => setReplayOpen(false)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">&times;</button>
                                        </div>
                                        <div className="p-5 flex flex-col gap-4">
                                            <p className="text-slate-400 text-[11px] leading-relaxed">Same request, same market state &mdash; different rules. Adjust all 6 policy levers and fire the replay.</p>

                                            {/* Min Margin */}
                                            <div>
                                                <div className="flex justify-between text-[11px] mb-1.5">
                                                    <label className="text-slate-400 font-bold uppercase tracking-wider">Min Margin Floor</label>
                                                    <span className="font-mono text-violet-300 font-bold">{replayPolicies.min_margin}</span>
                                                </div>
                                                <input type="range" min="0" max="50" step="1"
                                                    value={parseInt(replayPolicies.min_margin)}
                                                    onChange={e => setReplayPolicies(p => ({...p, min_margin: `${e.target.value}%`}))}
                                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                                />
                                            </div>

                                            {/* Scarcity Threshold */}
                                            <div>
                                                <div className="flex justify-between text-[11px] mb-1.5">
                                                    <label className="text-slate-400 font-bold uppercase tracking-wider">Scarcity Trigger</label>
                                                    <span className="font-mono text-violet-300 font-bold">{replayPolicies.scarcity_threshold}% avail</span>
                                                </div>
                                                <input type="range" min="0" max="50" step="5"
                                                    value={parseInt(replayPolicies.scarcity_threshold)}
                                                    onChange={e => setReplayPolicies(p => ({...p, scarcity_threshold: e.target.value}))}
                                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                                />
                                            </div>

                                            {/* Scarcity Multiplier */}
                                            <div>
                                                <div className="flex justify-between text-[11px] mb-1.5">
                                                    <label className="text-slate-400 font-bold uppercase tracking-wider">Scarcity Multiplier</label>
                                                    <span className="font-mono text-violet-300 font-bold">{replayPolicies.scarcity_multiplier}x</span>
                                                </div>
                                                <input type="range" min="1" max="10" step="0.5"
                                                    value={parseFloat(replayPolicies.scarcity_multiplier)}
                                                    onChange={e => setReplayPolicies(p => ({...p, scarcity_multiplier: e.target.value}))}
                                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                                />
                                            </div>

                                            {/* Max Market Premium */}
                                            <div>
                                                <div className="flex justify-between text-[11px] mb-1.5">
                                                    <label className="text-slate-400 font-bold uppercase tracking-wider">Max Market Premium</label>
                                                    <span className="font-mono text-violet-300 font-bold">{replayPolicies.max_market_premium}</span>
                                                </div>
                                                <input type="range" min="0" max="100" step="5"
                                                    value={parseInt(replayPolicies.max_market_premium)}
                                                    onChange={e => setReplayPolicies(p => ({...p, max_market_premium: `${e.target.value}%`}))}
                                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                                />
                                            </div>

                                            {/* Eviction Delta */}
                                            <div>
                                                <div className="flex justify-between text-[11px] mb-1.5">
                                                    <label className="text-slate-400 font-bold uppercase tracking-wider">Eviction Delta</label>
                                                    <span className="font-mono text-violet-300 font-bold">${parseFloat(replayPolicies.eviction_delta.toString().replace('$', '')).toFixed(2)}</span>
                                                </div>
                                                <input type="range" min="0.25" max="5.00" step="0.25"
                                                    value={parseFloat(replayPolicies.eviction_delta.toString().replace('$', ''))}
                                                    onChange={e => setReplayPolicies(p => ({...p, eviction_delta: `$${parseFloat(e.target.value).toFixed(2)}`}))}
                                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                                />
                                            </div>

                                            {/* Post-ROI Discount Floor */}
                                            <div>
                                                <div className="flex justify-between text-[11px] mb-1.5">
                                                    <label className="text-slate-400 font-bold uppercase tracking-wider">Post-ROI Discount Floor</label>
                                                    <span className="font-mono text-violet-300 font-bold">{replayPolicies.post_roi_discount_floor}</span>
                                                </div>
                                                <input type="range" min="0" max="90" step="5"
                                                    value={parseInt(replayPolicies.post_roi_discount_floor)}
                                                    onChange={e => setReplayPolicies(p => ({...p, post_roi_discount_floor: `${e.target.value}%`}))}
                                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                                />
                                            </div>

                                            <button
                                                onClick={() => { onReplay(replayPolicies); setReplayOpen(false); }}
                                                className="w-full mt-1 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[12px] uppercase tracking-widest transition-all duration-300 shadow-[0_4px_20px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                Fire Replay
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div ref={endRef} className="h-6" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentSidebar;
