import React from 'react';

const LiveFeed = ({ data }) => {
    const { state, request, decision } = data;

    const isApprove = decision.action === 'APPROVE';
    const isOverride = decision.action === 'OVERRIDE';
    const isEvict = decision.action === 'EVICT';

    const isReject = decision.action === 'REJECT';

    const getBorderColor = () => {
        if (isEvict || isReject) return 'border-red-500/50';
        if (isOverride) return 'border-yellow-500/50';
        if (isApprove) return 'border-green-500/50';
        return 'border-slate-500/50';
    };

    const getBadgeColor = () => {
        if (isEvict || isReject) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (isOverride) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        if (isApprove) return 'bg-green-500/20 text-green-400 border-green-500/30';
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    };

    const priceLabel = isReject && request.workload_type === 'Spot' ? 'Rejected Bid Price' : 
                       isReject ? 'Baseline Price (Rejected)' : 'Final Executed Price';
    const displayPrice = isReject && request.workload_type === 'Spot' && request.bid_price_per_hour
                       ? request.bid_price_per_hour
                       : decision.final_price_per_hour;

    const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className={`glass-card bg-slate-800/20 border-l-[6px] ${getBorderColor()} rounded-r-xl rounded-l-sm p-6 flex flex-col gap-5 animate-fade-in hover:bg-slate-800/40 transition-colors`}>
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
                        {/* Cost Recovery Status — drives Policy D (Lifecycle Aggression) */}
                        {state.cost_recovered ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)] animate-pulse"></span>
                                CapEx Recovered · Pure Profit Mode
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-amber-500/10 text-amber-400/80 border-amber-500/20 flex items-center gap-1.5">
                                <svg className="w-3 h-3 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Recovering CapEx
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
                    <h3 className="text-2xl font-display font-bold text-white mt-3 flex items-center gap-3">
                        {request.quantity}x {request.workload_type}
                        <span className="text-slate-400 font-sans font-normal text-sm tracking-wider uppercase">({request.duration_hours}h req)</span>
                    </h3>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className={`px-5 py-2 rounded-lg text-sm font-display font-bold border ${getBadgeColor()} uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(0,0,0,0.2)] backdrop-blur-sm`}>
                        {decision.action}
                    </div>
                </div>
            </div>
            <div className={`flex justify-between items-center py-3 mt-2 mb-2 bg-slate-900/60 rounded-xl px-5 border border-dashed hover:border-solid transition-all ${getBorderColor()} shadow-inner`}>
                <span className={`font-display font-bold uppercase tracking-[0.1em] text-xs flex items-center gap-2 ${isApprove ? 'text-green-400' : isOverride ? 'text-yellow-400' : isEvict || isReject ? 'text-red-400' : 'text-slate-400'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    {priceLabel}
                </span>
                <span className={`font-mono font-bold text-xl drop-shadow-md ${isApprove ? 'text-green-400' : isOverride ? 'text-yellow-400' : isEvict || isReject ? 'text-red-400' : 'text-slate-400'}`}>
                    ${displayPrice.toFixed(2)} <span className={`text-sm opacity-80 ${isApprove ? 'text-green-500' : isOverride ? 'text-yellow-500' : isEvict || isReject ? 'text-red-500' : 'text-slate-500'}`}>/hr</span>
                </span>
            </div>

            {/* Glass Box Explanation */}
            <div className="bg-slate-900/40 p-6 rounded-xl border border-white/5 relative overflow-hidden group hover:border-accent-500/30 transition-colors shadow-inner mt-1">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-500/50"></div>
                <div className="text-[11px] text-accent-400 font-display font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Glass-Box Explanation
                </div>
                <div className="text-slate-300 text-sm leading-relaxed antialiased font-light tracking-wide border-l-2 border-slate-700/50 pl-5 py-2 space-y-4">
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
                                        <span className="font-bold text-white font-display tracking-[0.1em] uppercase text-xs mr-2">{matchNoBullet[1]}:</span>
                                        <span className="text-slate-300">{matchNoBullet[2]}</span>
                                    </div>
                                </div>
                            );
                        }
                        return <p key={i} className="text-slate-300 leading-tall">{line}</p>;
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
