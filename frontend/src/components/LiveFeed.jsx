import React, { memo } from 'react';

const LiveFeed = memo(({ data }) => {
    const { state, request, decision } = data;

    const isApprove = decision.action === 'APPROVE';
    const isOverride = decision.action === 'OVERRIDE';
    const isEvict = decision.action === 'EVICT';
    const isReject = decision.action === 'REJECT';

    const isOnDemand = request.workload_type === 'On-Demand';
    const isSpot = request.workload_type === 'Spot';

    const basePrice = (state.depreciation_cost_per_hour + state.power_opex_per_hour) * 1.20;

    const actionBadge = (() => {
        if (isOnDemand && isOverride) return 'MODIFIED';
        if (isEvict) return 'APPROVE w/ EVICTION';
        return decision.action;
    })();

    const getBorderColor = () => {
        if (isReject) return 'border-red-500/40';
        if (isOverride) return 'border-yellow-500/40';
        if (isApprove || isEvict) return 'border-green-500/40';
        return 'border-slate-500/40';
    };

    const getBadgeColor = () => {
        if (isReject) return 'bg-red-500/10 text-red-400 border-red-500/20';
        if (isOverride) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        if (isApprove || isEvict) return 'bg-green-500/10 text-green-400 border-green-500/20';
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    };

    const priceLabel = isReject && isSpot ? 'Rejected Bid' : 
                       isReject ? 'Baseline (Rejected)' : 'Final Price';
    const displayPrice = isReject && isSpot && request.bid_price_per_hour
                       ? request.bid_price_per_hour
                       : decision.final_price_per_hour;

    const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <article className={`card bg-slate-800/30 border-l-4 ${getBorderColor()} rounded-r-lg rounded-l-sm p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 animate-fade-in hover:bg-slate-800/50 transition-colors`}>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-slate-400 tabular-nums">{request.request_id}</span>
                        <span className="text-xs text-slate-500 truncate max-w-[160px] sm:max-w-none">{request.region} · {request.gpu_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                        <span className={`text-xs font-medium tabular-nums px-2 py-0.5 rounded border 
                            ${state.available_inventory === 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                              state.available_inventory < (state.total_inventory * 0.15) ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            {state.available_inventory}/{state.total_inventory}
                        </span>
                        {state.active_spot_leases > 0 && (
                            <span className="text-xs font-medium tabular-nums px-2 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20">
                                Spot: {state.active_spot_leases}
                            </span>
                        )}
                        {state.cost_recovered ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded border bg-emerald-500/8 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true"></span>
                                Paid
                            </span>
                        ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded border bg-amber-500/8 text-amber-400/80 border-amber-500/15 flex items-center gap-1">
                                <svg className="w-3 h-3 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                CapEx
                            </span>
                        )}
                        {state.market_price_per_hour && (
                            <span className="hidden sm:flex items-center gap-1 text-xs font-medium tabular-nums px-2 py-0.5 rounded border bg-pink-500/8 text-pink-400 border-pink-500/20">
                                Mkt: {formatMoney(state.market_price_per_hour)}/hr
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white mt-3 flex items-center gap-2 sm:gap-3 flex-wrap">
                        {request.quantity}x <span className={`px-2 py-0.5 rounded text-xs ${isSpot ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15' : 'bg-primary-500/10 text-primary-400 border border-primary-500/15'}`}>{request.workload_type}</span>
                        <span className="text-slate-400 font-sans font-normal text-sm tabular-nums">({request.duration_hours}h)</span>
                    </h3>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <div className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-display font-bold border ${getBadgeColor()}`}>
                        {actionBadge}
                    </div>
                </div>
            </div>

            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 bg-slate-900/50 rounded-lg px-4 sm:px-5 border border-dashed hover:border-solid transition-all gap-2 ${getBorderColor()}`}>
                {isOnDemand && isOverride ? (
                    <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex flex-col">
                            <span className="text-slate-500 text-xs mb-0.5">Base</span>
                            <span className="text-slate-400 font-mono tabular-nums text-base sm:text-lg line-through decoration-red-500/40">${basePrice.toFixed(2)}<span className="text-xs">/hr</span></span>
                        </div>
                        <div className="flex flex-col sm:items-end">
                            <span className="text-yellow-400 text-xs mb-0.5 flex items-center gap-1.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Offered
                            </span>
                            <span className="text-yellow-400 font-mono font-bold tabular-nums text-lg sm:text-xl">${displayPrice.toFixed(2)}<span className="text-sm opacity-80">/hr</span></span>
                        </div>
                    </div>
                ) : (
                    <>
                        <span className={`font-display font-semibold text-xs flex items-center gap-2 ${isApprove || isEvict ? 'text-green-400' : isOverride ? 'text-yellow-400' : isReject ? 'text-red-400' : 'text-slate-400'}`}>
                            {priceLabel}
                        </span>
                        <div className="flex items-center gap-4 sm:gap-6">
                            {!isReject && (
                                <div className="flex flex-col items-end border-r border-slate-700/40 pr-4 sm:pr-6">
                                    <span className="text-slate-500 text-xs mb-0.5">Base</span>
                                    <span className="text-slate-400 font-mono tabular-nums text-sm">${basePrice.toFixed(2)}<span className="text-xs">/hr</span></span>
                                </div>
                            )}
                            <span className={`font-mono font-bold tabular-nums text-lg sm:text-xl ${isApprove || isEvict ? 'text-green-400' : isOverride ? 'text-yellow-400' : isReject ? 'text-red-400' : 'text-slate-400'}`}>
                                ${displayPrice.toFixed(2)} <span className={`text-sm opacity-80 ${isApprove || isEvict ? 'text-green-500' : isOverride ? 'text-yellow-500' : isReject ? 'text-red-500' : 'text-slate-500'}`}>/hr</span>
                            </span>
                        </div>
                    </>
                )}
            </div>

            <div className="bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-700/30 relative overflow-hidden group hover:border-accent-500/15 transition-colors">
                <p className="text-accent-400 font-display font-semibold text-xs mb-2 sm:mb-3">Explanation</p>
                <div className="text-slate-300 text-sm leading-relaxed pl-3 sm:pl-4 border-l-2 border-slate-700/30 space-y-2 sm:space-y-3">
                    {decision.explanation.split('\n').filter(line => line.trim()).map((line, i) => {
                        const match = line.match(/^-\s*\*\*(.*?)\*\*:(.*)/);
                        if (match) {
                            return (
                                <div key={i} className="flex gap-2 items-start">
                                    <span className="text-accent-400 mt-0.5 shrink-0" aria-hidden="true">·</span>
                                    <div className="min-w-0">
                                        <span className="font-semibold text-white text-xs mr-1.5">{match[1]}:</span>
                                        <span className="text-slate-300">{match[2]}</span>
                                    </div>
                                </div>
                            );
                        }
                        const matchNoBullet = line.match(/^\*\*(.*?)\*\*:(.*)/);
                        if (matchNoBullet) {
                             return (
                                <div key={i} className="flex gap-2 items-start">
                                    <span className="text-accent-400 mt-0.5 shrink-0" aria-hidden="true">·</span>
                                    <div className="min-w-0">
                                        <span className="font-semibold text-white text-xs mr-1.5">{matchNoBullet[1]}:</span>
                                        <span className="text-slate-300">{matchNoBullet[2]}</span>
                                    </div>
                                </div>
                            );
                        }
                        return <p key={i} className="text-slate-300">{line}</p>;
                    })}
                </div>
                {decision.target_eviction_id && (
                    <div className="mt-3 sm:mt-4 inline-flex bg-red-500/8 text-red-400 text-xs px-3 py-2 rounded-md border border-red-500/20 font-mono tabular-nums items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="truncate">Evicted: <span className="font-bold">{decision.target_eviction_id}</span></span>
                    </div>
                )}
            </div>
        </article>
    );
});
LiveFeed.displayName = 'LiveFeed';

export default LiveFeed;
