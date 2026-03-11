import React, { useEffect, useRef, useState } from 'react';

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

    let styleClass = 'bg-slate-800 border-slate-600';
    if (isJudge) {
        styleClass = 'bg-purple-900/20 border-purple-500/50';
    } else if (isPolicy) {
        styleClass = 'bg-slate-800/80 border-slate-600 border-dashed';
    }

    return (
        <div className={`border rounded-xl p-4 animate-slide-up shadow-md transition-all ${styleClass}`}>
            <h3 className={`font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2 ${isJudge ? 'text-purple-400' : isPolicy ? 'text-slate-400' : 'text-accent-400'}`}>
                {icon} {item.thought.agent_name}
            </h3>
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                <p className="font-medium text-white">{summary}</p>
                {rest && (
                    <div className="mt-2">
                        {expanded && (
                            <div className="mt-3 text-slate-400 border-t border-slate-700/50 pt-3 animate-fade-in text-xs leading-relaxed">
                                {rest}
                            </div>
                        )}
                        <button 
                            onClick={() => setExpanded(!expanded)} 
                            className="text-xs text-blue-400/80 mt-2 hover:text-blue-300 transition-colors flex items-center gap-1 font-semibold"
                        >
                            {expanded ? '▲ Hide Details' : '▼ Read Details'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const AgentSidebar = ({ streamData, isThinking }) => {
    const endRef = useRef(null);

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
        <div className="w-full xl:w-[450px] 2xl:w-[500px] flex flex-col gap-4 bg-slate-900/80 border-l border-slate-700/50 h-full overflow-y-auto px-6 py-6 custom-scrollbar shrink-0 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white flex items-center justify-between sticky top-0 bg-slate-900/90 py-2 backdrop-blur-md z-10 border-b border-slate-700/50">
                <span className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Multi-Agent Deal Desk
                </span>
            </h2>

            {streamData.length === 0 && !isThinking && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic text-center mt-10">
                    <svg className="w-16 h-16 mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>No active deliberations.</p>
                    <p className="text-sm mt-2">Run a manual tick to watch the agents negotiate.</p>
                </div>
            )}

            <div className="flex flex-col gap-4 mt-2">
                {initialContext && (
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 animate-fade-in shadow-lg">
                        <h3 className="text-blue-300 font-bold text-sm uppercase tracking-wider mb-2">New Deal Context</h3>
                        <div className="text-slate-300 text-sm font-mono flex flex-col gap-1">
                            <p>Request: {initialContext.request.quantity}x {initialContext.request.gpu_type} ({initialContext.request.duration_hours}h)</p>
                            <p>Avail: {initialContext.state.available_inventory} / {initialContext.state.total_inventory}</p>
                            <p>Comp ({initialContext.state.market_competitor_name}): ${initialContext.state.market_price_per_hour.toFixed(2)}/hr</p>
                        </div>
                    </div>
                )}
                
                {dealThoughts.map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                        <ThoughtCard item={item} />
                        {(idx < dealThoughts.length - 1 || (isThinking && expectedNextAgent)) && (
                            <div className="w-px h-6 bg-slate-600/50 mx-auto my-1"></div>
                        )}
                    </div>
                ))}
                
                {isThinking && expectedNextAgent && (
                    <div className="border border-slate-700/30 bg-slate-800/10 rounded-xl p-4 animate-pulse">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <span className="relative flex h-3 w-3 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-500"></span>
                            </span>
                            {expectedNextAgent.icon} {expectedNextAgent.name} is thinking...
                        </h3>
                    </div>
                )}

                {finalDecision && (
                    <div className="bg-slate-800 border-l-4 border-green-500 rounded-r-lg p-4 shadow-xl mt-4 animate-fade-in">
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Final Verdict Executed
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
                    <div className="mt-8 border-t-2 border-slate-700/80 pt-8 relative">
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-900 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Post-Mortem Policy Review
                        </div>
                        <div className="flex flex-col gap-4">
                            {policyThoughts.map((item, idx) => (
                                <div key={idx} className="flex flex-col">
                                    <ThoughtCard item={item} />
                                    {(idx < policyThoughts.length - 1 || (isThinking && expectedNextPolicyAgent)) && (
                                        <div className="w-px h-6 bg-slate-600/50 mx-auto my-1"></div>
                                    )}
                                </div>
                            ))}
                            
                            {isThinking && expectedNextPolicyAgent && (
                                <div className="border border-slate-700/30 bg-slate-800/10 rounded-xl p-4 animate-pulse">
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                        <span className="relative flex h-3 w-3 mr-1">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400"></span>
                                        </span>
                                        {expectedNextPolicyAgent.icon} {expectedNextPolicyAgent.name} is reviewing...
                                    </h3>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div ref={endRef} className="h-4" />
            </div>
        </div>
    );
};

export default AgentSidebar;
