import React from 'react';

const LiveFeed = ({ data }) => {
    const { state, request, quote, decision, inference_time } = data;

    const isApprove = decision.action === 'APPROVE';
    const isOverride = decision.action === 'OVERRIDE';
    const isEvict = decision.action === 'EVICT';

    const getBorderColor = () => {
        if (isEvict) return 'border-red-500/50';
        if (isOverride) return 'border-yellow-500/50';
        if (isApprove) return 'border-green-500/50';
        return 'border-slate-500/50';
    };

    const getBadgeColor = () => {
        if (isEvict) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (isOverride) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        if (isApprove) return 'bg-green-500/20 text-green-400 border-green-500/30';
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    };

    const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className={`bg-slate-800/40 border-l-[6px] ${getBorderColor()} rounded-r-xl rounded-l-sm p-5 flex flex-col gap-4 animate-fade-in hover:bg-slate-800/60 transition-colors`}>
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm text-slate-400 bg-slate-800 px-2 py-0.5 rounded shadow-inner">{request.request_id}</span>
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{request.region} • {request.gpu_type}</span>
                    </div>
                    {/* Fleet Hardware State Snapshot */}
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border 
                            ${state.available_inventory === 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                              state.available_inventory < (state.total_inventory * 0.15) ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
                              'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                            Avail: {state.available_inventory} / {state.total_inventory}
                        </span>
                        {state.active_spot_leases > 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-purple-500/20 text-purple-400 border-purple-500/30">
                                Active Spot: {state.active_spot_leases}
                            </span>
                        )}
                        {state.market_price_per_hour && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-pink-500/10 text-pink-400 border-pink-500/30 animate-pulse-slow">
                                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_5px_rgba(236,72,153,0.8)]"></div>
                                Mkt Pulse: {formatMoney(state.market_price_per_hour)}/hr 
                                <span className="text-pink-500/70 lowercase normal-case italic">via {state.market_competitor_name}</span>
                            </span>
                        )}
                    </div>
                    <h3 className="text-xl font-semibold text-white mt-1.5">
                        {request.quantity}x {request.workload_type}
                        <span className="text-slate-400 font-normal ml-2">({request.duration_hours}h req)</span>
                    </h3>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getBadgeColor()} uppercase tracking-widest shadow-lg`}>
                        {decision.action}
                    </div>
                    <div className="text-xs text-slate-500 mt-2 bg-slate-900/50 px-2 py-1 rounded inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {inference_time.toFixed(2)}s inference
                    </div>
                </div>
            </div>

            {/* Full Transparency Math Receipt */}
            <div className="bg-slate-900/50 rounded-lg p-4 my-2 border border-slate-700/50 font-mono text-sm shadow-inner">
                {/* Environmental Costs */}
                <div className="flex justify-between items-center py-1.5 text-slate-500 border-b border-slate-700/50 mb-2">
                    <span className="font-sans text-xs uppercase tracking-wider">Fleet Environment Costs</span>
                    <span>Depreciation: ${state.depreciation_cost_per_hour.toFixed(2)}/hr | Power: ${state.power_opex_per_hour.toFixed(2)}/hr</span>
                </div>

                {/* Computational Quotes */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400">Target Base Rate</span>
                        <span className="text-white">${quote.base_rate.toFixed(2)} /hr</span>
                    </div>

                    {quote.volume_discount_amount > 0 && (
                        <div className="flex justify-between items-center py-1 text-slate-400">
                            <span>Volume Discount</span>
                            <span className="text-green-400">- ${quote.volume_discount_amount.toFixed(2)}</span>
                        </div>
                    )}
                    
                    {quote.duration_discount_amount > 0 && (
                        <div className="flex justify-between items-center py-1 text-slate-400">
                            <span>Duration Discount</span>
                            <span className="text-green-400">- ${quote.duration_discount_amount.toFixed(2)}</span>
                        </div>
                    )}

                    {quote.spot_discount_amount > 0 && (
                        <div className="flex justify-between items-center py-1 text-slate-400">
                            <span>Spot / Preemptible Discount</span>
                            <span className="text-green-400">- ${quote.spot_discount_amount.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center py-2 mt-2 border-t border-slate-700">
                        <span className="text-slate-300 font-semibold uppercase tracking-wider text-xs font-sans">Final Computed Quote</span>
                        <div className="text-right">
                            <span className="text-white font-bold">${quote.base_price_per_hour.toFixed(2)} /hr</span>
                            <span className={`text-xs ml-2 ${quote.margin_percentage < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                ({(quote.margin_percentage * 100).toFixed(0)}% margin)
                            </span>
                        </div>
                    </div>
                    
                    {/* Agent Intervention */}
                    <div className={`flex justify-between items-center py-2 mt-1 border-t-2 border-dashed ${getBorderColor()}`}>
                        <span className={`font-semibold uppercase tracking-wider text-xs font-sans flex items-center gap-2 ${isApprove ? 'text-green-400' : isOverride ? 'text-yellow-400' : 'text-red-400'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            Agent Evaluated Price
                        </span>
                        <span className={`font-bold text-lg ${isApprove ? 'text-green-400' : isOverride ? 'text-yellow-400' : 'text-red-400'}`}>
                            ${decision.final_price_per_hour.toFixed(2)} /hr
                        </span>
                    </div>
                </div>
            </div>

            {/* Glass Box Explanation */}
            <div className="bg-slate-900/60 p-5 rounded-lg border border-slate-700/50 relative overflow-hidden group hover:border-accent-500/40 transition-colors shadow-inner">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-500/60"></div>
                <div className="text-xs text-accent-400 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Glass-Box Explanation
                </div>
                <div className="text-slate-200 text-sm leading-relaxed antialiased font-light tracking-wide border-l-2 border-slate-600 pl-4 py-2 space-y-3">
                    {decision.explanation.split('\n').filter(line => line.trim()).map((line, i) => {
                        // Match "- **BoldText**: Rest of line"
                        const match = line.match(/^-\s*\*\*(.*?)\*\*:(.*)/);
                        if (match) {
                            return (
                                <div key={i} className="flex gap-2 items-start">
                                    <span className="text-accent-400 mt-0.5">•</span>
                                    <div>
                                        <span className="font-bold text-white tracking-wider uppercase text-xs mr-2">{match[1]}:</span>
                                        <span className="text-slate-300">{match[2]}</span>
                                    </div>
                                </div>
                            );
                        }
                        // Match "**BoldText**: Rest of line" (no bullet point)
                        const matchNoBullet = line.match(/^\*\*(.*?)\*\*:(.*)/);
                        if (matchNoBullet) {
                             return (
                                <div key={i} className="flex gap-2 items-start">
                                    <span className="text-accent-400 mt-0.5">•</span>
                                    <div>
                                        <span className="font-bold text-white tracking-wider uppercase text-xs mr-2">{matchNoBullet[1]}:</span>
                                        <span className="text-slate-300">{matchNoBullet[2]}</span>
                                    </div>
                                </div>
                            );
                        }
                        return <p key={i}>{line}</p>;
                    })}
                </div>
                {decision.target_eviction_id && (
                    <div className="mt-4 inline-flex shadow-[0_0_10px_rgba(239,68,68,0.2)] bg-red-500/10 text-red-400 text-sm px-4 py-2 rounded-md border border-red-500/30 font-mono items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Target Evicted: <span className="font-bold">{decision.target_eviction_id}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveFeed;
