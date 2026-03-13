import React from 'react';

const POLICY_LABELS = {
    min_margin: { label: 'Min Margin Floor', unit: '' },
    scarcity_threshold: { label: 'Scarcity Threshold', unit: '%' },
    scarcity_multiplier: { label: 'Scarcity Multiplier', unit: 'x' },
    max_market_premium: { label: 'Max Market Premium', unit: '' },
    eviction_delta: { label: 'Eviction Delta', unit: '' },
    post_roi_discount_floor: { label: 'Post-ROI Discount Floor', unit: '' },
};

const ActionBadge = ({ action }) => {
    const colors = {
        APPROVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
        OVERRIDE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.2)]',
        REJECT: 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
        EVICT: 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.2)]',
    };
    return (
        <span className={`px-4 py-1.5 rounded-lg font-display font-bold text-sm border uppercase tracking-[0.15em] ${colors[action] || colors.REJECT}`}>
            {action}
        </span>
    );
};

const normalizePolicy = (val) => {
    if (val === undefined || val === null) return '';
    return val.toString().replace(/[%$]/g, '').trim();
};

const DeltaTag = ({ original, replay }) => {
    if (normalizePolicy(original) === normalizePolicy(replay)) return <span className="text-[10px] text-slate-500 ml-1">(no change)</span>;
    return <span className="text-[10px] font-bold text-violet-400 ml-1 bg-violet-500/10 px-1.5 py-0.5 rounded">CHANGED</span>;
};

const PolicyComparisonModal = ({ isOpen, onClose, comparison }) => {
    if (!isOpen || !comparison) return null;

    const { original, replay } = comparison;

    const priceDelta = replay.finalPrice - original.finalPrice;
    const priceDeltaStr = priceDelta >= 0 ? `+$${priceDelta.toFixed(2)}` : `-$${Math.abs(priceDelta).toFixed(2)}`;
    const priceRose = priceDelta > 0;
    const priceUnchanged = priceDelta === 0;

    const actionChanged = original.action !== replay.action;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md"></div>

            {/* Modal Panel */}
            <div
                className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-white/10 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.8)] animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-xl px-8 py-5 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-white font-display font-bold text-xl flex items-center gap-3">
                            <span className="bg-violet-500/20 p-2 rounded-lg border border-violet-500/30">
                                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </span>
                            Policy Sensitivity Analysis
                        </h2>
                        <p className="text-slate-400 text-sm mt-1 ml-12">
                            Same deal · Same market · Different rules
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 flex flex-col gap-8">
                    {/* Deal context */}
                    {comparison.dealRequest && (
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl px-5 py-4 flex flex-wrap gap-4 text-sm font-mono">
                            <span className="text-slate-500 uppercase text-[10px] font-bold tracking-widest self-center">Deal:</span>
                            <span className="text-slate-200 font-bold">{comparison.dealRequest.quantity}x {comparison.dealRequest.gpu_type}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-300">{comparison.dealRequest.duration_hours}h</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-300">{comparison.dealRequest.workload_type}</span>
                            {comparison.dealRequest.bid_price_per_hour && (
                                <>
                                    <span className="text-slate-500">·</span>
                                    <span className="text-slate-300">Bid: ${comparison.dealRequest.bid_price_per_hour.toFixed(2)}/hr</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Outcome Delta Banner */}
                    <div className={`rounded-xl p-5 border flex items-center justify-between gap-6 ${actionChanged ? 'bg-violet-900/20 border-violet-500/40' : 'bg-slate-800/40 border-white/10'}`}>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Decision Delta</span>
                            <div className="flex items-center gap-3 flex-wrap">
                                <ActionBadge action={original.action} />
                                <svg className="w-5 h-5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                                <ActionBadge action={replay.action} />
                                {actionChanged && (
                                    <span className="text-[10px] font-bold text-violet-300 bg-violet-500/20 px-2 py-1 rounded border border-violet-500/30">
                                        OUTCOME FLIPPED
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 text-right">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Price Delta</span>
                            <div className="flex items-center gap-2 justify-end">
                                <span className="font-mono text-slate-400 text-sm">${original.finalPrice.toFixed(2)}</span>
                                <span className="text-slate-600">→</span>
                                <span className="font-mono text-white font-bold text-lg">${replay.finalPrice.toFixed(2)}</span>
                                {!priceUnchanged && (
                                    <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${priceRose ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                        {priceDeltaStr}/hr
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Side by Side Policy Comparison */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Original */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                                <h3 className="text-white font-display font-bold text-sm uppercase tracking-[0.15em]">Original Run</h3>
                            </div>
                            {Object.entries(POLICY_LABELS).map(([key, meta]) => {
                                const val = original.policies?.[key];
                                const replayVal = replay.policies?.[key];
                                const changed = val !== replayVal;
                                return (
                                    <div key={key} className={`p-3 rounded-xl border transition-all ${changed ? 'bg-blue-900/10 border-blue-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{meta.label}</p>
                                        <p className="font-mono text-blue-300 font-bold">
                                            {val !== undefined && val !== null ? `${val}${!val.toString().includes('%') && !val.toString().includes('$') && meta.unit ? meta.unit : ''}` : '—'}
                                        </p>
                                    </div>
                                );
                            })}
                            {/* Original Verdict */}
                            <div className="p-4 mt-2 bg-slate-900/60 rounded-xl border border-white/10">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Verdict</p>
                                <ActionBadge action={original.action} />
                                <p className="font-mono font-bold text-white text-lg mt-2">${original.finalPrice.toFixed(2)}<span className="text-slate-500 text-sm font-normal">/hr</span></p>
                                {original.explanation && (
                                    <p className="text-slate-400 text-xs mt-2 leading-relaxed line-clamp-4">{original.explanation}</p>
                                )}
                            </div>
                        </div>

                        {/* Replay */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]"></div>
                                <h3 className="text-white font-display font-bold text-sm uppercase tracking-[0.15em]">Policy Replay</h3>
                            </div>
                            {Object.entries(POLICY_LABELS).map(([key, meta]) => {
                                const val = replay.policies?.[key];
                                const origVal = original.policies?.[key];
                                const changed = normalizePolicy(val) !== normalizePolicy(origVal);
                                return (
                                    <div key={key} className={`p-3 rounded-xl border transition-all ${changed ? 'bg-violet-900/20 border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-white/[0.02] border-white/5'}`}>
                                        <p className="text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                                            <span className={changed ? 'text-violet-400' : 'text-slate-500'}>{meta.label}</span>
                                            {changed && <span className="text-[9px] text-violet-400 bg-violet-500/20 px-1.5 rounded font-bold">MODIFIED</span>}
                                        </p>
                                        <p className={`font-mono font-bold ${changed ? 'text-violet-300' : 'text-blue-300'}`}>
                                            {val !== undefined && val !== null ? `${val}${!val.toString().includes('%') && !val.toString().includes('$') && meta.unit ? meta.unit : ''}` : '—'}
                                        </p>
                                    </div>
                                );
                            })}
                            {/* Replay Verdict */}
                            <div className="p-4 mt-2 bg-slate-900/60 rounded-xl border border-violet-500/20">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Verdict</p>
                                <ActionBadge action={replay.action} />
                                <p className="font-mono font-bold text-white text-lg mt-2">${replay.finalPrice.toFixed(2)}<span className="text-slate-500 text-sm font-normal">/hr</span></p>
                                {replay.explanation && (
                                    <p className="text-slate-400 text-xs mt-2 leading-relaxed line-clamp-4">{replay.explanation}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolicyComparisonModal;
