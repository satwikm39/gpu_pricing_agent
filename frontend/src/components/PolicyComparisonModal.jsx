import React, { useEffect, useRef, useCallback, memo } from 'react';

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
        APPROVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        OVERRIDE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
        REJECT: 'bg-red-500/10 text-red-400 border-red-500/25',
        EVICT: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
    };
    return (
        <span className={`px-3 py-1 rounded-md font-display font-bold text-sm border uppercase tracking-wider ${colors[action] || colors.REJECT}`}>
            {action}
        </span>
    );
};

const normalizePolicy = (val) => {
    if (val === undefined || val === null) return '';
    return val.toString().replace(/[%$]/g, '').trim();
};

const PolicyComparisonModal = memo(({ isOpen, onClose, comparison }) => {
    const dialogRef = useRef(null);
    const previousFocusRef = useRef(null);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
            return;
        }
        if (e.key !== 'Tab') return;

        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement;
            document.addEventListener('keydown', handleKeyDown);
            requestAnimationFrame(() => {
                dialogRef.current?.querySelector('button')?.focus();
            });
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                previousFocusRef.current.focus();
            }
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen || !comparison) return null;

    const { original, replay } = comparison;

    const priceDelta = replay.finalPrice - original.finalPrice;
    const priceDeltaStr = priceDelta >= 0 ? `+$${priceDelta.toFixed(2)}` : `-$${Math.abs(priceDelta).toFixed(2)}`;
    const priceRose = priceDelta > 0;
    const priceUnchanged = priceDelta === 0;
    const actionChanged = original.action !== replay.action;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60" aria-hidden="true"></div>

            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="comparison-title"
                className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/60 rounded-xl shadow-xl animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 bg-slate-900/95 px-6 md:px-8 py-5 border-b border-slate-700/60 flex items-center justify-between">
                    <div>
                        <h2 id="comparison-title" className="text-white font-display font-bold text-lg flex items-center gap-3">
                            <span className="bg-accent-500/10 p-2 rounded-lg border border-accent-500/20">
                                <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </span>
                            Policy Sensitivity Analysis
                        </h2>
                        <p className="text-slate-500 text-sm mt-1 ml-12">
                            Same deal · Same market · Different rules
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close comparison"
                        className="text-slate-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 md:p-8 flex flex-col gap-6">
                    {comparison.dealRequest && (
                        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-4 py-3 flex flex-wrap gap-3 text-sm font-mono">
                            <span className="text-slate-500 uppercase text-[10px] font-bold tracking-widest self-center">Deal:</span>
                            <span className="text-slate-200 font-bold">{comparison.dealRequest.quantity}x {comparison.dealRequest.gpu_type}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-300">{comparison.dealRequest.duration_hours}h</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-300">{comparison.dealRequest.workload_type}</span>
                            {comparison.dealRequest.bid_price_per_hour && (
                                <>
                                    <span className="text-slate-600">·</span>
                                    <span className="text-slate-300">Bid: ${comparison.dealRequest.bid_price_per_hour.toFixed(2)}/hr</span>
                                </>
                            )}
                        </div>
                    )}

                    <div className={`rounded-lg p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${actionChanged ? 'bg-accent-900/10 border-accent-500/25' : 'bg-slate-800/30 border-slate-700/40'}`}>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Decision Delta</span>
                            <div className="flex items-center gap-3 flex-wrap">
                                <ActionBadge action={original.action} />
                                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                                <ActionBadge action={replay.action} />
                                {actionChanged && (
                                    <span className="text-[10px] font-bold text-accent-300 bg-accent-500/10 px-2 py-1 rounded border border-accent-500/20">
                                        OUTCOME FLIPPED
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 sm:text-right">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Price Delta</span>
                            <div className="flex items-center gap-2 sm:justify-end">
                                <span className="font-mono text-slate-400 text-sm">${original.finalPrice.toFixed(2)}</span>
                                <span className="text-slate-600" aria-hidden="true">→</span>
                                <span className="font-mono text-white font-bold text-lg">${replay.finalPrice.toFixed(2)}</span>
                                {!priceUnchanged && (
                                    <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${priceRose ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                        {priceDeltaStr}/hr
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-primary-400" aria-hidden="true"></div>
                                <h3 className="text-white font-display font-bold text-sm uppercase tracking-wider">Original Run</h3>
                            </div>
                            {Object.entries(POLICY_LABELS).map(([key, meta]) => {
                                const val = original.policies?.[key];
                                const replayVal = replay.policies?.[key];
                                const changed = normalizePolicy(val) !== normalizePolicy(replayVal);
                                return (
                                    <div key={key} className={`p-3 rounded-lg border transition-colors ${changed ? 'bg-primary-900/10 border-primary-500/15' : 'bg-slate-800/30 border-slate-700/30'}`}>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{meta.label}</p>
                                        <p className="font-mono text-primary-300 font-bold">
                                            {val !== undefined && val !== null ? `${val}${!val.toString().includes('%') && !val.toString().includes('$') && meta.unit ? meta.unit : ''}` : '—'}
                                        </p>
                                    </div>
                                );
                            })}
                            <div className="p-4 mt-2 bg-slate-800/40 rounded-lg border border-slate-700/40">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Verdict</p>
                                <ActionBadge action={original.action} />
                                <p className="font-mono font-bold text-white text-lg mt-2">${original.finalPrice.toFixed(2)}<span className="text-slate-500 text-sm font-normal">/hr</span></p>
                                {original.explanation && (
                                    <p className="text-slate-400 text-xs mt-2 leading-relaxed line-clamp-4">{original.explanation}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-accent-400" aria-hidden="true"></div>
                                <h3 className="text-white font-display font-bold text-sm uppercase tracking-wider">Policy Replay</h3>
                            </div>
                            {Object.entries(POLICY_LABELS).map(([key, meta]) => {
                                const val = replay.policies?.[key];
                                const origVal = original.policies?.[key];
                                const changed = normalizePolicy(val) !== normalizePolicy(origVal);
                                return (
                                    <div key={key} className={`p-3 rounded-lg border transition-colors ${changed ? 'bg-accent-900/10 border-accent-500/20' : 'bg-slate-800/30 border-slate-700/30'}`}>
                                        <p className="text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                                            <span className={changed ? 'text-accent-400' : 'text-slate-500'}>{meta.label}</span>
                                            {changed && <span className="text-[9px] text-accent-400 bg-accent-500/10 px-1.5 rounded font-bold">MODIFIED</span>}
                                        </p>
                                        <p className={`font-mono font-bold ${changed ? 'text-accent-300' : 'text-primary-300'}`}>
                                            {val !== undefined && val !== null ? `${val}${!val.toString().includes('%') && !val.toString().includes('$') && meta.unit ? meta.unit : ''}` : '—'}
                                        </p>
                                    </div>
                                );
                            })}
                            <div className="p-4 mt-2 bg-slate-800/40 rounded-lg border border-accent-500/15">
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
});
PolicyComparisonModal.displayName = 'PolicyComparisonModal';

export default PolicyComparisonModal;
