import React, { useRef, useState, memo, useMemo } from 'react';

const AGENT_SEQUENCE = [
    { node: 'pricing', name: 'Pricing Base Agent', icon: '💰' },
    { node: 'negative', name: 'Conservative Risk Agent', icon: '🛡️' },
    { node: 'positive', name: 'Opportunistic Growth Agent', icon: '🚀' },
    { node: 'market', name: 'Market Monitor Agent', icon: '📈' },
    { node: 'inventory', name: 'Capacity Agent', icon: '📦' },
    { node: 'judge', name: 'Supreme Judge', icon: '⚖️' },
    { node: 'bidding', name: 'Bidding Agent', icon: '🤝' }
];

const POLICY_SEQUENCE = [
    { node: 'analyst', name: 'Policy Analyst Agent', icon: '🧪' },
    { node: 'critique', name: 'Policy Critique Agent', icon: '📝' }
];

const ThoughtCard = memo(({ item }) => {
    const [expanded, setExpanded] = useState(false);
    const isJudge = item.node === 'judge';
    const isPolicy = ['analyst', 'critique'].includes(item.node);
    
    const iconObj = AGENT_SEQUENCE.find(a => a.node === item.node) || POLICY_SEQUENCE.find(a => a.node === item.node);
    const icon = iconObj?.icon || '🤖';
    
    const sentences = item.thought.content.split(/(?<=[.!?])\s+/);
    const summary = sentences[0];
    const rest = sentences.slice(1).join(' ');

    const suggestions = [...item.thought.content.matchAll(/\[SUGGESTION:\s*([^\]]+)\]/g)].map(m => m[1]);
    const capacityMatch = item.thought.content.match(/\[CAPACITY_ACTION:\s*([^\]]+)\]/);
    const capacityAction = capacityMatch ? capacityMatch[1] : null;

    let styleClass = 'card border-slate-700/40';
    let textClass = 'text-primary-400';
    if (isJudge) {
        styleClass = 'bg-accent-900/10 border border-accent-500/25 rounded-lg';
        textClass = 'text-accent-400';
    } else if (item.node === 'bidding') {
        styleClass = 'bg-yellow-900/10 border border-yellow-500/25 rounded-lg';
        textClass = 'text-yellow-400';
    } else if (isPolicy) {
        styleClass = 'bg-slate-800/30 border border-slate-600/50 border-dashed rounded-lg';
        textClass = 'text-slate-400';
    }

    return (
        <div className={`p-4 animate-slide-up w-full ${styleClass}`}>
            <h3 className={`font-display font-bold text-xs tracking-widest uppercase mb-3 flex items-center gap-2 ${textClass}`}>
                <span className="text-lg bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/30" aria-hidden="true">{icon}</span> 
                {item.thought.agent_name}
            </h3>
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans break-words">
                {suggestions.length > 0 && item.node === 'critique' && (
                    <div className="mb-4 flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-accent-400 uppercase tracking-wider flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Policy Suggestions ({suggestions.length})
                        </span>
                        {suggestions.map((s, i) => (
                            <div key={i} className="px-3 py-2 bg-accent-500/5 border border-accent-500/15 rounded-lg flex items-center gap-3">
                                <div className="bg-accent-500/15 px-2 py-0.5 rounded font-mono text-[10px] text-accent-300 font-bold shrink-0">
                                    {i + 1}
                                </div>
                                <span className="text-sm font-mono font-bold text-white break-words leading-tight">
                                    {s}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {capacityAction && (
                    <div className="mb-4 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-start gap-3">
                        <div className="bg-emerald-600 p-1.5 rounded-lg shrink-0 mt-0.5">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
                            <div className="mt-3 text-slate-400 border-t border-slate-700/40 pt-3 animate-fade-in text-[13px] leading-relaxed break-words">
                                {rest.replace(/\[(SUGGESTION|CAPACITY_ACTION):[^\]]+\]/g, '').trim()}
                            </div>
                        )}
                        <button 
                            onClick={() => setExpanded(!expanded)} 
                            aria-expanded={expanded}
                            className="text-xs text-primary-400 mt-2 hover:text-primary-300 transition-colors flex items-center gap-1.5 font-bold uppercase tracking-wider"
                        >
                            {expanded ? '▲ Hide Analysis' : '▼ Read Full Analysis'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});
ThoughtCard.displayName = 'ThoughtCard';

const AgentSidebar = memo(({ streamData, isThinking, lastDealContext, onReplay, onExecuteCounterOffer, onViewComparison, hasComparison }) => {
    const endRef = useRef(null);
    const [replayOpen, setReplayOpen] = useState(false);
    const [customBidPrice, setCustomBidPrice] = useState('');
    const [replayPolicies, setReplayPolicies] = useState({
        min_margin: '15%',
        scarcity_threshold: '10',
        scarcity_multiplier: '3.0',
        max_market_premium: '20%',
        eviction_delta: '1.50',
        post_roi_discount_floor: '50%'
    });

    const thoughts = useMemo(() => streamData.filter(d => d.type === 'thought'), [streamData]);
    const dealThoughts = useMemo(() => thoughts.filter(t => !['analyst', 'critique'].includes(t.node)), [thoughts]);
    const policyThoughts = useMemo(() => thoughts.filter(t => ['analyst', 'critique'].includes(t.node)), [thoughts]);

    const initialContext = useMemo(() => streamData.find(d => d.type === 'initial'), [streamData]);
    const finalDecision = useMemo(() => [...streamData].reverse().find(d => d.type === 'final_decision'), [streamData]);
    const hasBidding = useMemo(() => thoughts.some(t => t.node === 'bidding'), [thoughts]);
    const biddingThought = useMemo(() => thoughts.find(t => t.node === 'bidding'), [thoughts]);
    
    let expectedNextAgent = null;
    let expectedNextPolicyAgent = null;

    if (isThinking) {
        if (dealThoughts.length === 0) {
            expectedNextAgent = AGENT_SEQUENCE[0];
        } else if (policyThoughts.length === 0 && !finalDecision) {
            const lastNode = dealThoughts[dealThoughts.length - 1].node;
            const lastIdx = AGENT_SEQUENCE.findIndex(a => a.node === lastNode);
            
            if (lastNode === 'bidding') {
                expectedNextAgent = AGENT_SEQUENCE[0];
            } else if (lastNode === 'judge') {
                expectedNextAgent = { name: 'Graph Router', icon: '🔄' };
            } else if (lastIdx !== -1 && lastIdx < AGENT_SEQUENCE.length - 1) {
                expectedNextAgent = AGENT_SEQUENCE[lastIdx + 1];
            }
        }
        
        if (finalDecision && policyThoughts.length < POLICY_SEQUENCE.length) {
            expectedNextPolicyAgent = POLICY_SEQUENCE[policyThoughts.length];
        }
    }

    return (
        <div className="panel w-full xl:w-[420px] 2xl:w-[480px] flex flex-col h-full overflow-hidden shrink-0">
            <h2 className="text-lg font-display font-bold text-white flex items-center justify-between sticky top-0 bg-slate-900/95 px-6 py-4 z-20 border-b border-slate-700/60">
                <span className="flex items-center gap-3">
                    <div className="bg-primary-500/10 p-2 rounded-lg border border-primary-500/20">
                        <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    Agent Workflow
                </span>
                {streamData.some(d => d.is_replay) && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border bg-accent-500/10 text-accent-300 border-accent-500/20 flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Policy Replay
                    </span>
                )}
            </h2>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 border-transparent relative">
                {(streamData.length > 0 || isThinking) && (
                    <div className="absolute left-10 top-10 bottom-10 w-px bg-gradient-to-b from-slate-600/40 via-slate-700/20 to-transparent z-0" aria-hidden="true"></div>
                )}

                {streamData.length === 0 && !isThinking ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-center px-4">
                        <div className="bg-slate-800/50 p-6 rounded-full border border-slate-700/30 mb-6">
                            <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="font-semibold text-slate-400">Idle Pipeline</p>
                        <p className="text-sm mt-2 font-mono">Awaiting manual or auto tick execution.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5 w-full z-10 relative mt-2">
                        {initialContext && (
                            <div className="bg-primary-900/5 border border-primary-500/15 rounded-lg p-4 animate-fade-in ml-8 relative">
                                <div className="absolute -left-[45px] top-4 border-2 border-primary-500/40 bg-slate-900 w-4 h-4 rounded-full z-10" aria-hidden="true"></div>
                                <h3 className="text-primary-300 font-display font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Incoming Deal Context
                                </h3>
                                {(() => {
                                    const basePrice = (initialContext.state.depreciation_cost_per_hour + initialContext.state.power_opex_per_hour) * 1.20;
                                    const isSpot = initialContext.request.workload_type === 'Spot';
                                    return (
                                        <div className="text-slate-300 text-sm font-mono flex flex-col gap-1.5 bg-slate-800/40 p-3 rounded-lg border border-slate-700/30">
                                            <p className="flex justify-between"><span className="text-slate-500">Request:</span> <span>{initialContext.request.quantity}x {initialContext.request.gpu_type} ({initialContext.request.duration_hours}h)</span></p>
                                            <p className="flex justify-between items-center">
                                                <span className="text-slate-500">Type:</span> 
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${isSpot ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'}`}>
                                                    {initialContext.request.workload_type}
                                                </span>
                                            </p>
                                            <p className="flex justify-between items-center"><span className="text-slate-500">Base Math:</span> <span className="text-emerald-400 font-bold">${basePrice.toFixed(2)}/hr</span></p>
                                            {isSpot && initialContext.request.bid_price_per_hour && (
                                                <p className="flex justify-between items-center"><span className="text-slate-500">Spot Bid:</span> <span className="text-yellow-400 font-bold">${initialContext.request.bid_price_per_hour.toFixed(2)}/hr</span></p>
                                            )}
                                            <p className="flex justify-between"><span className="text-slate-500">Avail:</span> <span>{initialContext.state.available_inventory} / {initialContext.state.total_inventory}</span></p>
                                            
                                            <div className="mt-2 pt-2 border-t border-slate-700/30 flex items-center justify-between">
                                                <span className="text-pink-400/70 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500" aria-hidden="true"></div>
                                                    {initialContext.state.market_competitor_name} (Mkt)
                                                </span>
                                                <span className="text-pink-400 font-bold">${initialContext.state.market_price_per_hour.toFixed(2)}/hr</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        
                        {dealThoughts.map((item, idx) => (
                            <div key={idx} className="flex flex-col ml-8 relative">
                                <div className="absolute -left-[45px] top-6 border-2 border-slate-600 bg-slate-900 w-4 h-4 rounded-full z-10" aria-hidden="true"></div>
                                <ThoughtCard item={item} />
                            </div>
                        ))}
                        
                        {isThinking && expectedNextAgent && (
                            <div className="border border-slate-700/30 bg-slate-800/20 rounded-lg p-4 animate-pulse ml-8 relative">
                                <div className="absolute -left-[45px] top-6 border-2 border-primary-500/30 bg-slate-900 w-4 h-4 rounded-full z-10" aria-hidden="true"></div>
                                <h3 className="font-display font-bold text-xs uppercase tracking-widest text-slate-400 flex items-center gap-3">
                                    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-500"></span>
                                    </span>
                                    {expectedNextAgent.icon} {expectedNextAgent.name} executing...
                                </h3>
                            </div>
                        )}

                        {finalDecision && !hasBidding && (
                            <div className="bg-emerald-900/5 border border-emerald-500/20 rounded-lg p-4 mt-2 animate-fade-in ml-8 relative">
                                <div className="absolute -left-[45px] top-6 border-2 border-emerald-500 bg-slate-900 w-4 h-4 rounded-full z-10" aria-hidden="true"></div>
                                <h3 className="text-emerald-400 font-display font-bold text-sm tracking-wider mb-3 flex items-center gap-2 uppercase">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Final Executed Verdict
                                </h3>
                                {(() => {
                                    const isSpot = initialContext?.request?.workload_type === 'Spot';
                                    
                                    let actionLabel = finalDecision.decision.action;
                                    if (initialContext?.request?.workload_type === 'On-Demand' && finalDecision.decision.action === 'OVERRIDE') {
                                        actionLabel = 'MODIFIED';
                                    } else if (finalDecision.decision.action === 'EVICT') {
                                        actionLabel = 'APPROVE w/ EVICTION';
                                    }

                                    const isApprove = finalDecision.decision.action === 'APPROVE' || finalDecision.decision.action === 'EVICT';
                                    const textColor = isApprove ? 'text-green-400' : finalDecision.decision.action === 'OVERRIDE' ? 'text-yellow-400' : 'text-red-400';

                                    return (
                                        <div className="text-sm">
                                            <p className="mb-1">
                                                <span className="text-slate-400">Action:</span> 
                                                <span className={`font-bold ml-2 ${textColor}`}>
                                                    {actionLabel}
                                                </span>
                                            </p>
                                            <p className="mb-1">
                                                <span className="text-slate-400">
                                                    {finalDecision.decision.action === 'REJECT' && isSpot ? 'Rejected Bid Price:' : 
                                                     finalDecision.decision.action === 'REJECT' ? 'Baseline Price (Rejected):' : 'Final Price:'}
                                                </span> 
                                                <span className="text-white font-bold ml-2">
                                                    ${(finalDecision.decision.action === 'REJECT' && isSpot && initialContext?.request?.bid_price_per_hour 
                                                        ? initialContext.request.bid_price_per_hour 
                                                        : finalDecision.decision.final_price_per_hour).toFixed(2)}/hr
                                                </span>
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        
                        {finalDecision && hasBidding && biddingThought && !isThinking && (
                            <div className="bg-yellow-900/5 border border-yellow-500/20 rounded-lg p-4 mt-2 animate-fade-in ml-8 relative">
                                <div className="absolute -left-[45px] top-6 border-2 border-yellow-500 bg-slate-900 w-4 h-4 rounded-full z-10" aria-hidden="true"></div>
                                <h3 className="text-yellow-400 font-display font-bold text-sm tracking-wider mb-3 flex items-center gap-2 uppercase">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Interactive Counter-Offer Menu
                                </h3>
                                <div className="text-sm text-slate-300 mb-4 leading-relaxed">
                                    The Deal Desk rejected the original bid. Choose how you'd like to proceed with the Counter Bid.
                                </div>
                                {(() => {
                                    const match = biddingThought.thought.content.match(/\[COUNTER_OFFER:\s*\$?([\d.]+)\]/);
                                    const recommendedPrice = match ? parseFloat(match[1]) : null;
                                    
                                    const altV100Price = recommendedPrice ? (recommendedPrice * 0.45).toFixed(2) : '0.95';
                                    const altA100Price = recommendedPrice ? (recommendedPrice * 0.75).toFixed(2) : '1.45';

                                    return (
                                        <div className="flex flex-col gap-3 border-l-2 border-yellow-500/20 pl-4 py-1">
                                            <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-lg border border-slate-700/30 hover:border-yellow-500/20 transition-colors">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Agent Strategy</p>
                                                    <p className="text-sm font-bold text-yellow-400">Match base quote at <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded ml-1">${recommendedPrice?.toFixed(2)}/hr</span></p>
                                                </div>
                                                <button 
                                                    onClick={() => recommendedPrice && onExecuteCounterOffer(recommendedPrice)}
                                                    disabled={!recommendedPrice}
                                                    className="px-4 py-2 rounded border border-yellow-500/30 text-yellow-400 hover:bg-yellow-600 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-lg border border-slate-700/30 hover:border-primary-500/20 transition-colors gap-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                                                        Pivot: V100 Compute
                                                    </p>
                                                    <p className="text-sm font-bold text-slate-300">Offer fully amortized <span className="font-mono text-primary-400">V100</span> at <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded ml-1">${altV100Price}/hr</span></p>
                                                </div>
                                                <button 
                                                    onClick={() => onExecuteCounterOffer(parseFloat(altV100Price), 'V100')}
                                                    className="px-4 py-2 rounded bg-primary-500/10 border border-primary-500/25 text-primary-400 hover:bg-primary-600 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors whitespace-nowrap"
                                                >
                                                    Pitch V100
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-lg border border-slate-700/30 hover:border-primary-500/20 transition-colors gap-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest mb-0.5">Pivot: A100 Compute</p>
                                                    <p className="text-sm font-bold text-slate-300">Offer older generation <span className="font-mono text-primary-400">A100</span> at <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded ml-1">${altA100Price}/hr</span></p>
                                                </div>
                                                <button 
                                                    onClick={() => onExecuteCounterOffer(parseFloat(altA100Price), 'A100')}
                                                    className="px-4 py-2 rounded bg-primary-500/10 border border-primary-500/25 text-primary-400 hover:bg-primary-600 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors whitespace-nowrap"
                                                >
                                                    Pitch A100
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700/30 mt-1">
                                                <label htmlFor="custom-bid-price" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manual Counter</label>
                                                <div className="flex gap-2 w-full">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono" aria-hidden="true">$</span>
                                                        <input 
                                                            id="custom-bid-price"
                                                            type="number"
                                                            step="0.01"
                                                            value={customBidPrice}
                                                            onChange={(e) => setCustomBidPrice(e.target.value)}
                                                            placeholder="Custom Price"
                                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            const val = parseFloat(customBidPrice);
                                                            if (!isNaN(val) && val > 0) {
                                                                onExecuteCounterOffer(val);
                                                            }
                                                        }}
                                                        disabled={!customBidPrice || isNaN(parseFloat(customBidPrice))}
                                                        className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                    >
                                                        Submit Custom
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {(finalDecision || policyThoughts.length > 0) && (
                            <div className="mt-6 border-t border-slate-700/40 pt-8 relative">
                                <div className="absolute -top-[11px] left-0 bg-slate-950 pr-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    Post-Mortem Policy Review
                                </div>
                                <div className="flex flex-col gap-5 ml-8 relative mt-2">
                                    {policyThoughts.map((item, idx) => (
                                        <div key={idx} className="flex flex-col relative w-full">
                                            <div className="absolute -left-[45px] top-6 border-2 border-slate-600 bg-slate-900 w-4 h-4 rounded-full z-10" aria-hidden="true"></div>
                                            <ThoughtCard item={item} />
                                        </div>
                                    ))}
                                    
                                    {isThinking && expectedNextPolicyAgent && (
                                        <div className="border border-slate-700/30 border-dashed bg-slate-800/10 rounded-lg p-4 animate-pulse relative">
                                            <div className="absolute -left-[45px] top-6 border-2 border-slate-600/40 bg-slate-900 w-4 h-4 rounded-full z-10" aria-hidden="true"></div>
                                            <h3 className="font-display font-bold text-xs uppercase tracking-widest text-slate-500 flex items-center gap-3">
                                                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
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

                        {finalDecision && lastDealContext && !isThinking && (
                            <div className="mt-6 relative z-10 flex flex-col gap-3">
                                {hasComparison && (
                                    <button
                                        onClick={onViewComparison}
                                        className="w-full py-3 px-4 rounded-lg border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold text-[12px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2.5 animate-slide-up"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        View Impact Comparison
                                    </button>
                                )}

                                {!replayOpen ? (
                                    <button
                                        onClick={() => setReplayOpen(true)}
                                        className="w-full py-3 px-4 rounded-lg border border-accent-500/25 bg-accent-500/5 hover:bg-accent-500/10 text-accent-300 font-bold text-[12px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2.5"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Re-Run with Different Policies
                                    </button>
                                ) : (
                                    <div className="rounded-lg border border-accent-500/25 bg-slate-900/80 overflow-hidden animate-fade-in">
                                        <div className="px-5 py-3 bg-accent-900/10 border-b border-accent-500/15 flex items-center justify-between">
                                            <span className="text-accent-300 font-bold text-[11px] uppercase tracking-widest flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                Policy Wargame — Replay
                                            </span>
                                            <button onClick={() => setReplayOpen(false)} aria-label="Close replay panel" className="text-slate-500 hover:text-slate-300 text-lg leading-none">&times;</button>
                                        </div>
                                        <div className="p-5 flex flex-col gap-4">
                                            <p className="text-slate-400 text-[11px] leading-relaxed">Same request, same market state &mdash; different rules. Adjust all 6 policy levers and fire the replay.</p>

                                            {[
                                                { key: 'min_margin', label: 'Min Margin Floor', min: 0, max: 50, step: 1, format: v => `${v}%`, parse: v => parseInt(v), update: v => `${v}%` },
                                                { key: 'scarcity_threshold', label: 'Scarcity Trigger', min: 0, max: 50, step: 5, format: v => `${v}% avail`, parse: v => parseInt(v), update: v => `${v}` },
                                                { key: 'scarcity_multiplier', label: 'Scarcity Multiplier', min: 1, max: 10, step: 0.5, format: v => `${v}x`, parse: v => parseFloat(v), update: v => `${v}` },
                                                { key: 'max_market_premium', label: 'Max Market Premium', min: 0, max: 100, step: 5, format: v => replayPolicies.max_market_premium, parse: v => parseInt(v), update: v => `${v}%` },
                                                { key: 'eviction_delta', label: 'Eviction Delta', min: 0.25, max: 5, step: 0.25, format: v => `$${parseFloat(v.toString().replace('$', '')).toFixed(2)}`, parse: v => parseFloat(v.toString().replace('$', '')), update: v => `$${parseFloat(v).toFixed(2)}` },
                                                { key: 'post_roi_discount_floor', label: 'Post-ROI Discount Floor', min: 0, max: 90, step: 5, format: v => replayPolicies.post_roi_discount_floor, parse: v => parseInt(v), update: v => `${v}%` },
                                            ].map(({ key, label, min, max, step, format, parse, update }) => (
                                                <div key={key}>
                                                    <div className="flex justify-between text-[11px] mb-1.5">
                                                        <label htmlFor={`replay-${key}`} className="text-slate-400 font-bold uppercase tracking-wider">{label}</label>
                                                        <span className="font-mono text-accent-300 font-bold">{format(replayPolicies[key])}</span>
                                                    </div>
                                                    <input
                                                        id={`replay-${key}`}
                                                        type="range"
                                                        min={min}
                                                        max={max}
                                                        step={step}
                                                        value={parse(replayPolicies[key])}
                                                        onChange={e => setReplayPolicies(p => ({...p, [key]: update(e.target.value)}))}
                                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent-500"
                                                    />
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => { onReplay(replayPolicies); setReplayOpen(false); }}
                                                className="w-full mt-1 py-3 rounded-lg bg-accent-600 hover:bg-accent-500 text-white font-bold text-[12px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
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
});
AgentSidebar.displayName = 'AgentSidebar';

export default AgentSidebar;
