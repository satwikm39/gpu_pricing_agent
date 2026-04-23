import React, { memo, useState } from 'react';

// ── Policy parser (mirrors backend _parse_policy_value) ────────────────────
const parsePolicyValue = (val) => {
    if (val == null) return NaN;
    const s = String(val).trim();
    if (s.endsWith('%')) return parseFloat(s);
    if (s.startsWith('$')) return parseFloat(s.slice(1));
    if (s.endsWith('x')) return parseFloat(s);
    return parseFloat(s);
};

// ── Base-rate lookup (mirrors backend calculator.py) ───────────────────────
const BASE_RATES = {
    B200: 5.50, H200: 4.00, H100: 3.50, A100: 2.20,
    L40S: 1.20, V100: 1.10, RTX4090: 1.80, T4: 0.40,
};

const LiveFeed = memo(({ data }) => {
    const { state, request, decision, policies } = data;

    const isApprove = decision.action === 'APPROVE';
    const isOverride = decision.action === 'OVERRIDE';
    const isEvict = decision.action === 'EVICT';
    const isReject = decision.action === 'REJECT';

    const isOnDemand = request.workload_type === 'On-Demand';
    const isSpot = request.workload_type === 'Spot';

    const totalCost = state.depreciation_cost_per_hour + state.power_opex_per_hour;
    const baseRate = BASE_RATES[request.gpu_type] || 1.00;
    const spotDiscount = isSpot ? 0.60 : 0.0;
    const volumeDiscount = request.quantity > 50 ? 0.05 : 0.0;
    const durationDiscount = request.duration_hours > 720 ? 0.10 : 0.0;
    const totalDiscount = Math.min(spotDiscount + volumeDiscount + durationDiscount, 0.80);
    const basePrice = baseRate * (1 - totalDiscount);

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

    // ── Compute decision boundaries ──────────────────────────────────────
    const [mathOpen, setMathOpen] = useState(false);

    const boundaries = (() => {
        if (!policies) return null;

        const minMarginPct = parsePolicyValue(policies.min_margin ?? '10');
        const postRoiPct = parsePolicyValue(policies.post_roi_discount_floor ?? '50');
        const maxPremiumPct = parsePolicyValue(policies.max_market_premium ?? '20');

        const marginFloor = totalCost * (1 + minMarginPct / 100);
        const marketCeiling = state.market_price_per_hour * (1 + maxPremiumPct / 100);

        const computedBasePrice = baseRate * (1 - totalDiscount);

        let postRoiFloor = null;
        let postRoiVerdict = null;
        if (state.cost_recovered && isSpot) {
            const lifecycleFloor = computedBasePrice * (1 - postRoiPct / 100);
            postRoiFloor = Math.max(lifecycleFloor, totalCost * 0.1);
            if (request.bid_price_per_hour != null) {
                postRoiVerdict = request.bid_price_per_hour >= postRoiFloor ? 'ACCEPT' : 'REJECT';
            }
        }

        return {
            minMarginPct,
            postRoiPct,
            maxPremiumPct,
            marginFloor,
            marketCeiling,
            computedBasePrice,
            postRoiFloor,
            postRoiVerdict,
        };
    })();

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

            {/* ── Decision Math (collapsible) ──────────────────────────────── */}
            {boundaries && (
                <div className="rounded-lg border border-slate-700/30 overflow-hidden">
                    <button
                        onClick={() => setMathOpen(!mathOpen)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left min-h-[40px]"
                        aria-expanded={mathOpen}
                    >
                        <span className="text-xs font-display font-semibold text-slate-400 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Decision Math
                        </span>
                        <svg className={`w-4 h-4 text-slate-500 transition-transform ${mathOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {mathOpen && (
                        <div className="px-4 py-3 bg-slate-900/40 border-t border-slate-700/30 flex flex-col gap-3 animate-fade-in">
                            {/* Cost breakdown */}
                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cost Breakdown</span>
                                <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                                    <div className="bg-slate-800/60 rounded px-2.5 py-2 border border-slate-700/30">
                                        <span className="text-slate-500 block mb-0.5">Depreciation</span>
                                        <span className="text-white">${state.depreciation_cost_per_hour.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-slate-800/60 rounded px-2.5 py-2 border border-slate-700/30">
                                        <span className="text-slate-500 block mb-0.5">Power OPEX</span>
                                        <span className="text-white">${state.power_opex_per_hour.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-slate-800/60 rounded px-2.5 py-2 border border-slate-700/30">
                                        <span className="text-slate-500 block mb-0.5">Total Cost</span>
                                        <span className="text-amber-400 font-semibold">${totalCost.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Policy floors & ceilings */}
                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Policy Bounds</span>
                                <div className="flex flex-col gap-1.5">
                                    {/* Policy A — Margin Floor */}
                                    <div className={`flex items-center justify-between px-3 py-2 rounded border text-xs font-mono tabular-nums ${
                                        boundaries.postRoiFloor != null
                                            ? 'bg-slate-800/30 border-slate-700/20 opacity-60 line-through decoration-slate-500/40'
                                            : 'bg-slate-800/60 border-slate-700/30'
                                    }`}>
                                        <span className="flex items-center gap-2 text-slate-400">
                                            <span className="bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold no-underline">A</span>
                                            <span className="no-underline">Margin Floor ({boundaries.minMarginPct}%)</span>
                                        </span>
                                        <span className="text-white no-underline font-semibold">${boundaries.marginFloor.toFixed(2)}/hr</span>
                                    </div>

                                    {/* Policy D — Post-ROI Floor (when applicable) */}
                                    {boundaries.postRoiFloor != null && (
                                        <div className={`flex flex-col gap-2 px-3 py-2.5 rounded border text-xs font-mono tabular-nums ${
                                            boundaries.postRoiVerdict === 'ACCEPT'
                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                : 'bg-red-500/5 border-red-500/20'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-2 text-slate-300">
                                                    <span className="bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">D</span>
                                                    Post-ROI Floor ({boundaries.postRoiPct}% off)
                                                </span>
                                                <span className="text-emerald-400 font-semibold">${boundaries.postRoiFloor.toFixed(2)}/hr</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] pl-6">
                                                <span className="text-slate-500">
                                                    = max(${boundaries.computedBasePrice.toFixed(2)} × {(1 - boundaries.postRoiPct / 100).toFixed(2)}, ${totalCost.toFixed(2)} × 0.10)
                                                </span>
                                            </div>
                                            {request.bid_price_per_hour != null && (
                                                <div className={`flex items-center gap-2 pl-6 text-[11px] font-semibold ${
                                                    boundaries.postRoiVerdict === 'ACCEPT' ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${boundaries.postRoiVerdict === 'ACCEPT' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                                    Bid ${request.bid_price_per_hour.toFixed(2)} {boundaries.postRoiVerdict === 'ACCEPT' ? '≥' : '<'} floor ${boundaries.postRoiFloor.toFixed(2)} → {boundaries.postRoiVerdict}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Policy E — Market Ceiling */}
                                    <div className="flex items-center justify-between px-3 py-2 rounded bg-slate-800/60 border border-slate-700/30 text-xs font-mono tabular-nums">
                                        <span className="flex items-center gap-2 text-slate-400">
                                            <span className="bg-pink-500/15 text-pink-400 px-1.5 py-0.5 rounded text-[10px] font-bold">E</span>
                                            Market Ceiling ({boundaries.maxPremiumPct}%)
                                        </span>
                                        <span className="text-white font-semibold">${boundaries.marketCeiling.toFixed(2)}/hr</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

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
