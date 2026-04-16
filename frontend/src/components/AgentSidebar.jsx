import React, { useRef, useState, memo, useMemo } from 'react';

const AGENT_SEQUENCE = [
    { node: 'pricing', name: 'Base Price Agent', icon: '💰' },
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

const renderFormattedText = (text) => {
    if (!text) return text;
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold text-slate-200">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

const ThoughtCard = memo(({ item }) => {
    const [expanded, setExpanded] = useState(false);
    const isJudge = item.node === 'judge';
    const isPolicy = ['analyst', 'critique'].includes(item.node);

    const iconObj = AGENT_SEQUENCE.find(a => a.node === item.node) || POLICY_SEQUENCE.find(a => a.node === item.node);
    const icon = iconObj?.icon || '🤖';

    const match = item.thought.content.match(/(.*?[.!?])(?:\s+)(.*)/s);
    const summary = match ? match[1] : item.thought.content;
    const rest = match ? match[2] : '';

    const suggestions = [...item.thought.content.matchAll(/\[SUGGESTION:\s*([^\]]+)\]/g)].map(m => m[1]);
    const capacityMatch = item.thought.content.match(/\[CAPACITY_ACTION:\s*([^\]]+)\]/);
    const capacityAction = capacityMatch ? capacityMatch[1] : null;

    let styleClass = 'card border-slate-700/40';
    let textClass = 'text-primary-400';
    if (isJudge) {
        styleClass = 'bg-accent-900/10 border border-accent-500/20 rounded-lg';
        textClass = 'text-accent-400';
    } else if (item.node === 'bidding') {
        styleClass = 'bg-yellow-900/10 border border-yellow-500/20 rounded-lg';
        textClass = 'text-yellow-400';
    } else if (isPolicy) {
        styleClass = 'bg-slate-800/30 border border-slate-600/50 border-dashed rounded-lg';
        textClass = 'text-slate-400';
    }

    return (
        <div className={`p-3 sm:p-4 animate-slide-up w-full ${styleClass}`}>
            <h3 className={`font-display font-semibold text-xs tracking-wide mb-2 sm:mb-3 flex items-center gap-2 ${textClass}`}>
                <span className="text-base" aria-hidden="true">{icon}</span>
                <span className="truncate">{item.thought.agent_name}</span>
            </h3>
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans break-words">
                {suggestions.length > 0 && item.node === 'critique' && (
                    <div className="mb-3 sm:mb-4 flex flex-col gap-2">
                        <span className="text-xs font-medium text-accent-400 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Suggestions ({suggestions.length})
                        </span>
                        {suggestions.map((s, i) => (
                            <div key={i} className="px-2.5 sm:px-3 py-2 bg-accent-500/5 border border-accent-500/15 rounded-lg flex items-center gap-2 sm:gap-3">
                                <span className="bg-accent-500/15 px-1.5 py-0.5 rounded font-mono text-xs text-accent-300 font-medium tabular-nums shrink-0">
                                    {i + 1}
                                </span>
                                <span className="text-sm font-mono text-white break-words leading-tight">
                                    {s}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {capacityAction && (
                    <div className="mb-3 sm:mb-4 px-2.5 sm:px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-start gap-2 sm:gap-3">
                        <div className="bg-emerald-600 p-1 sm:p-1.5 rounded-lg shrink-0 mt-0.5">
                            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-xs text-emerald-400">Capacity</span>
                            <span className="text-sm font-mono text-white break-words leading-tight">
                                {capacityAction}
                            </span>
                        </div>
                    </div>
                )}
                <p className="font-medium text-slate-100">{summary}</p>
                {rest && (
                    <div className="mt-3">
                        {expanded && (
                            <div className="mt-3 text-slate-400 border-t border-slate-700/40 pt-3 animate-fade-in text-sm leading-relaxed break-words">
                                {renderFormattedText(rest.replace(/\[(SUGGESTION|CAPACITY_ACTION):[^\]]+\]/g, '').trim())}
                            </div>
                        )}
                        <button
                            onClick={() => setExpanded(!expanded)}
                            aria-expanded={expanded}
                            className="min-h-[36px] text-xs text-primary-400 mt-2 hover:text-primary-300 transition-colors flex items-center gap-1.5 font-medium"
                        >
                            {expanded ? '▲ Hide' : '▼ Full Analysis'}
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
        <div className="panel w-full flex flex-col h-full overflow-hidden shrink-0">
            <div className="flex items-center justify-between sticky top-0 bg-slate-900/95 px-4 sm:px-6 py-3 sm:py-4 z-20 border-b border-slate-700/50">
                <h2 className="text-base sm:text-lg font-display font-bold text-white">Agent Workflow</h2>
                {streamData.some(d => d.is_replay) && (
                    <span className="text-xs font-medium px-2 py-1 rounded-md border bg-accent-500/10 text-accent-300 border-accent-500/20 flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Replay
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 sm:py-6 border-transparent relative">
                {(streamData.length > 0 || isThinking) && (
                    <div className="absolute left-8 sm:left-10 top-10 bottom-10 w-px bg-gradient-to-b from-slate-600/40 via-slate-700/20 to-transparent z-0" aria-hidden="true"></div>
                )}

                {streamData.length === 0 && !isThinking ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-4">
                        <p className="text-sm text-slate-400">Idle Pipeline</p>
                        <p className="text-xs mt-1 font-mono text-slate-600">Awaiting tick execution</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 sm:gap-5 w-full z-10 relative mt-2">
                        {initialContext && (
                            <div className="bg-primary-900/5 border border-primary-500/15 rounded-lg p-3 sm:p-4 animate-fade-in ml-6 sm:ml-8 relative">
                                <div className="absolute -left-[37px] sm:-left-[45px] top-4 border-2 border-primary-500/40 bg-slate-900 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full z-10" aria-hidden="true"></div>
                                <h3 className="text-primary-300 font-display font-semibold text-xs mb-2 sm:mb-3 flex items-center gap-2">
                                    <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Incoming Deal
                                </h3>
                                {(() => {
                                    const basePrice = (initialContext.state.depreciation_cost_per_hour + initialContext.state.power_opex_per_hour) * 1.20;
                                    const isSpot = initialContext.request.workload_type === 'Spot';
                                    return (
                                        <div className="text-slate-300 text-sm font-mono tabular-nums flex flex-col gap-1.5 bg-slate-800/40 p-2.5 sm:p-3 rounded-lg border border-slate-700/30">
                                            <p className="flex justify-between"><span className="text-slate-500">Req:</span> <span className="truncate ml-2">{initialContext.request.quantity}x {initialContext.request.gpu_type} ({initialContext.request.duration_hours}h)</span></p>
                                            <p className="flex justify-between items-center">
                                                <span className="text-slate-500">Type:</span>
                                                <span className={`px-2 py-0.5 rounded text-xs ${isSpot ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'}`}>
                                                    {initialContext.request.workload_type}
                                                </span>
                                            </p>
                                            <p className="flex justify-between items-center"><span className="text-slate-500">Base:</span> <span className="text-emerald-400 font-bold">${basePrice.toFixed(2)}/hr</span></p>
                                            {isSpot && initialContext.request.bid_price_per_hour && (
                                                <p className="flex justify-between items-center"><span className="text-slate-500">Bid:</span> <span className="text-yellow-400 font-bold">${initialContext.request.bid_price_per_hour.toFixed(2)}/hr</span></p>
                                            )}
                                            <p className="flex justify-between"><span className="text-slate-500">Avail:</span> <span>{initialContext.state.available_inventory}/{initialContext.state.total_inventory}</span></p>

                                            <div className="mt-2 pt-2 border-t border-slate-700/30 flex items-center justify-between">
                                                <span className="text-pink-400/70 text-xs flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500" aria-hidden="true"></div>
                                                    {initialContext.state.market_competitor_name}
                                                </span>
                                                <span className="text-pink-400 font-bold">${initialContext.state.market_price_per_hour.toFixed(2)}/hr</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {dealThoughts.map((item, idx) => (
                            <div key={idx} className="flex flex-col ml-6 sm:ml-8 relative">
                                <div className="absolute -left-[37px] sm:-left-[45px] top-6 border-2 border-slate-600 bg-slate-900 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full z-10" aria-hidden="true"></div>
                                <ThoughtCard item={item} />
                            </div>
                        ))}

                        {isThinking && expectedNextAgent && (
                            <div className="border border-slate-700/30 bg-slate-800/20 rounded-lg p-3 sm:p-4 animate-pulse ml-6 sm:ml-8 relative">
                                <div className="absolute -left-[37px] sm:-left-[45px] top-6 border-2 border-primary-500/30 bg-slate-900 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full z-10" aria-hidden="true"></div>
                                <h3 className="font-display text-xs text-slate-400 flex items-center gap-2 sm:gap-3">
                                    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-500"></span>
                                    </span>
                                    <span className="truncate">{expectedNextAgent.icon} {expectedNextAgent.name} executing...</span>
                                </h3>
                            </div>
                        )}

                        {finalDecision && !hasBidding && (
                            <div className="bg-emerald-900/5 border border-emerald-500/20 rounded-lg p-3 sm:p-4 mt-2 animate-fade-in ml-6 sm:ml-8 relative">
                                <div className="absolute -left-[37px] sm:-left-[45px] top-6 border-2 border-emerald-500 bg-slate-900 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full z-10" aria-hidden="true"></div>
                                <h3 className="text-emerald-400 font-display font-semibold text-sm mb-2 sm:mb-3 flex items-center gap-2">
                                    <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Final Verdict
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
                                        <div className="text-sm space-y-1 tabular-nums">
                                            <p>
                                                <span className="text-slate-400">Action:</span>
                                                <span className={`font-bold ml-2 ${textColor}`}>{actionLabel}</span>
                                            </p>
                                            <p>
                                                <span className="text-slate-400">
                                                    {finalDecision.decision.action === 'REJECT' && isSpot ? 'Rejected Bid:' :
                                                        finalDecision.decision.action === 'REJECT' ? 'Baseline:' : 'Price:'}
                                                </span>
                                                <span className="text-white font-bold ml-2 font-mono">
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
                            <div className="bg-yellow-900/5 border border-yellow-500/20 rounded-lg p-3 sm:p-4 mt-2 animate-fade-in ml-6 sm:ml-8 relative">
                                <div className="absolute -left-[37px] sm:-left-[45px] top-6 border-2 border-yellow-500 bg-slate-900 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full z-10" aria-hidden="true"></div>
                                <h3 className="text-yellow-400 font-display font-semibold text-sm mb-2 sm:mb-3 flex items-center gap-2">
                                    <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Counter-Offer
                                </h3>
                                <p className="text-sm text-slate-300 mb-3 sm:mb-4 leading-relaxed">
                                    The Deal Desk rejected the original bid. Choose how to proceed.
                                </p>
                                {(() => {
                                    const match = biddingThought.thought.content.match(/\[COUNTER_OFFER:\s*\$?([\d.]+)\]/);
                                    const recommendedPrice = match ? parseFloat(match[1]) : null;

                                    const altV100Price = recommendedPrice ? (recommendedPrice * 0.45).toFixed(2) : '0.95';
                                    const altA100Price = recommendedPrice ? (recommendedPrice * 0.75).toFixed(2) : '1.45';

                                    return (
                                        <div className="flex flex-col gap-2.5 sm:gap-3 border-l-2 border-yellow-500/20 pl-3 sm:pl-4 py-1">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-800/40 p-3 rounded-lg border border-slate-700/30 hover:border-yellow-500/20 transition-colors">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-500 mb-0.5">Agent Strategy</p>
                                                    <p className="text-sm font-medium text-yellow-400">Match at <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded ml-1 tabular-nums">${recommendedPrice?.toFixed(2)}/hr</span></p>
                                                </div>
                                                <button
                                                    onClick={() => recommendedPrice && onExecuteCounterOffer(recommendedPrice)}
                                                    disabled={!recommendedPrice}
                                                    className="min-h-[36px] px-3 sm:px-4 py-1.5 sm:py-2 rounded border border-yellow-500/30 text-yellow-400 hover:bg-yellow-600 hover:text-white text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                                                >
                                                    Approve
                                                </button>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-800/40 p-3 rounded-lg border border-slate-700/30 hover:border-primary-500/20 transition-colors">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-primary-400 mb-0.5">Pivot: V100</p>
                                                    <p className="text-sm text-slate-300"><span className="font-mono text-primary-400">V100</span> at <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded ml-1 tabular-nums">${altV100Price}/hr</span></p>
                                                </div>
                                                <button
                                                    onClick={() => onExecuteCounterOffer(parseFloat(altV100Price), 'V100')}
                                                    className="min-h-[36px] px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-600 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
                                                >
                                                    Pitch V100
                                                </button>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-800/40 p-3 rounded-lg border border-slate-700/30 hover:border-primary-500/20 transition-colors">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-primary-400 mb-0.5">Pivot: A100</p>
                                                    <p className="text-sm text-slate-300"><span className="font-mono text-primary-400">A100</span> at <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded ml-1 tabular-nums">${altA100Price}/hr</span></p>
                                                </div>
                                                <button
                                                    onClick={() => onExecuteCounterOffer(parseFloat(altA100Price), 'A100')}
                                                    className="min-h-[36px] px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-600 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
                                                >
                                                    Pitch A100
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700/30 mt-1">
                                                <label htmlFor="custom-bid-price" className="text-xs text-slate-500">Manual Counter</label>
                                                <div className="flex gap-2 w-full">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono" aria-hidden="true">$</span>
                                                        <input
                                                            id="custom-bid-price"
                                                            type="number"
                                                            step="0.01"
                                                            value={customBidPrice}
                                                            onChange={(e) => setCustomBidPrice(e.target.value)}
                                                            placeholder="Price"
                                                            className="w-full min-h-[40px] bg-slate-900 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-white font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
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
                                                        className="min-h-[40px] px-3 sm:px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                    >
                                                        Submit
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {(finalDecision || policyThoughts.length > 0) && (
                            <div className="mt-6 sm:mt-8 border-t border-slate-700/40 pt-6 sm:pt-8 relative">
                                <p className="absolute -top-[11px] left-0 bg-slate-950 pr-4 text-xs text-slate-500 font-display flex items-center gap-2">
                                    Policy Review
                                </p>
                                <div className="flex flex-col gap-4 sm:gap-5 ml-6 sm:ml-8 relative mt-2">
                                    {policyThoughts.map((item, idx) => (
                                        <div key={idx} className="flex flex-col relative w-full">
                                            <div className="absolute -left-[37px] sm:-left-[45px] top-6 border-2 border-slate-600 bg-slate-900 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full z-10" aria-hidden="true"></div>
                                            <ThoughtCard item={item} />
                                        </div>
                                    ))}

                                    {isThinking && expectedNextPolicyAgent && (
                                        <div className="border border-slate-700/30 border-dashed bg-slate-800/10 rounded-lg p-3 sm:p-4 animate-pulse relative">
                                            <div className="absolute -left-[37px] sm:-left-[45px] top-6 border-2 border-slate-600/40 bg-slate-900 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full z-10" aria-hidden="true"></div>
                                            <h3 className="font-display text-xs text-slate-500 flex items-center gap-2 sm:gap-3">
                                                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-500 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
                                                </span>
                                                <span className="truncate">{expectedNextPolicyAgent.icon} {expectedNextPolicyAgent.name} auditing...</span>
                                            </h3>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {finalDecision && lastDealContext && !isThinking && (
                            <div className="mt-6 sm:mt-8 relative z-10 flex flex-col gap-2.5 sm:gap-3">
                                {hasComparison && (
                                    <button
                                        onClick={onViewComparison}
                                        className="min-h-[44px] w-full py-3 px-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-medium transition-colors flex items-center justify-center gap-2 animate-slide-up"
                                    >
                                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        View Comparison
                                    </button>
                                )}

                                {!replayOpen ? (
                                    <button
                                        onClick={() => setReplayOpen(true)}
                                        className="min-h-[44px] w-full py-3 px-4 rounded-lg border border-accent-500/20 bg-accent-500/5 hover:bg-accent-500/10 text-accent-300 text-xs font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Re-Run with Different Policies
                                    </button>
                                ) : (
                                    <div className="rounded-lg border border-accent-500/20 bg-slate-900/80 overflow-hidden animate-fade-in">
                                        <div className="px-4 sm:px-5 py-3 bg-accent-900/10 border-b border-accent-500/15 flex items-center justify-between">
                                            <span className="text-accent-300 text-xs font-medium flex items-center gap-2">
                                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                Policy Replay
                                            </span>
                                            <button onClick={() => setReplayOpen(false)} aria-label="Close replay panel" className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-300 text-lg leading-none rounded-md hover:bg-slate-800">&times;</button>
                                        </div>
                                        <div className="p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                                            <p className="text-slate-400 text-xs leading-relaxed">Same request, same market — different rules. Adjust all 6 levers and fire the replay.</p>

                                            {[
                                                { key: 'min_margin', label: 'Min Margin', min: 0, max: 50, step: 1, format: v => `${v}%`, parse: v => parseInt(v), update: v => `${v}%` },
                                                { key: 'scarcity_threshold', label: 'Scarcity Trigger', min: 0, max: 50, step: 5, format: v => `${v}%`, parse: v => parseInt(v), update: v => `${v}` },
                                                { key: 'scarcity_multiplier', label: 'Scarcity Mult.', min: 1, max: 10, step: 0.5, format: v => `${v}x`, parse: v => parseFloat(v), update: v => `${v}` },
                                                { key: 'max_market_premium', label: 'Market Premium', min: 0, max: 100, step: 5, format: v => replayPolicies.max_market_premium, parse: v => parseInt(v), update: v => `${v}%` },
                                                { key: 'eviction_delta', label: 'Eviction Delta', min: 0.25, max: 5, step: 0.25, format: v => `$${parseFloat(v.toString().replace('$', '')).toFixed(2)}`, parse: v => parseFloat(v.toString().replace('$', '')), update: v => `$${parseFloat(v).toFixed(2)}` },
                                                { key: 'post_roi_discount_floor', label: 'Post-ROI Floor', min: 0, max: 90, step: 5, format: v => replayPolicies.post_roi_discount_floor, parse: v => parseInt(v), update: v => `${v}%` },
                                            ].map(({ key, label, min, max, step, format, parse, update }) => (
                                                <div key={key}>
                                                    <div className="flex justify-between text-xs mb-1.5">
                                                        <label htmlFor={`replay-${key}`} className="text-slate-400">{label}</label>
                                                        <span className="font-mono text-accent-300 tabular-nums">{format(replayPolicies[key])}</span>
                                                    </div>
                                                    <input
                                                        id={`replay-${key}`}
                                                        type="range"
                                                        min={min}
                                                        max={max}
                                                        step={step}
                                                        value={parse(replayPolicies[key])}
                                                        onChange={e => setReplayPolicies(p => ({ ...p, [key]: update(e.target.value) }))}
                                                        className="w-full h-2 bg-slate-700 rounded-lg cursor-pointer"
                                                    />
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => { onReplay(replayPolicies); setReplayOpen(false); }}
                                                className="min-h-[44px] w-full mt-1 py-3 rounded-lg bg-accent-600 hover:bg-accent-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                Fire Replay
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div ref={endRef} className="h-4 sm:h-6" />
                    </div>
                )}
            </div>
        </div>
    );
});
AgentSidebar.displayName = 'AgentSidebar';

export default AgentSidebar;
