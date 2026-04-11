import React, { memo } from 'react';

const MetricCards = memo(({ metrics, fleetState }) => {
    const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="card p-4 sm:p-5 relative overflow-hidden">
                <div className="text-slate-400 text-xs sm:text-sm font-medium mb-1">Revenue</div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">{formatMoney(metrics.total_revenue)}</div>
            </div>

            <div className="card p-4 sm:p-5 relative overflow-hidden">
                <div className="text-slate-400 text-xs sm:text-sm font-medium mb-1">Trust Score</div>
                <div className="flex items-end gap-1 sm:gap-2">
                    <div className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight ${metrics.trust_score < 80 ? 'text-red-400' : 'text-white'}`}>{metrics.trust_score}</div>
                    <div className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1 leading-snug">/ 100</div>
                </div>
                {metrics.trust_score < 80 && (
                    <div className="text-[10px] text-red-500 mt-1" role="alert">SLA At Risk</div>
                )}
            </div>

            <div className="card p-4 sm:p-5 relative overflow-hidden flex flex-col justify-center">
                <div className="flex gap-3 sm:gap-4">
                    <div className="flex-1">
                        <div className="text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider font-medium mb-0.5">Evicted</div>
                        <div className="text-lg sm:text-xl font-bold text-red-400">{metrics.evictions}</div>
                    </div>
                    <div className="w-px bg-slate-700/40" aria-hidden="true"></div>
                    <div className="flex-1">
                        <div className="text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider font-medium mb-0.5">Rejected</div>
                        <div className="text-lg sm:text-xl font-bold text-slate-300">{metrics.rejected_deals}</div>
                    </div>
                </div>
            </div>

            {fleetState ? (
                <div className="card p-4 sm:p-5 flex flex-col justify-center">
                    <div className="text-slate-400 text-[10px] sm:text-[11px] font-medium mb-1.5 flex justify-between uppercase tracking-wider">
                        <span>Fleet</span>
                        <span>{fleetState.available_inventory}/{fleetState.total_inventory}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/40" role="progressbar" aria-valuenow={fleetState.available_inventory} aria-valuemin={0} aria-valuemax={fleetState.total_inventory} aria-label="Fleet availability">
                        <div 
                            className={`h-full ${fleetState.available_inventory < (fleetState.total_inventory * 0.15) ? 'bg-red-500' : 'bg-green-500'} transition-all duration-700 ease-out`} 
                            style={{width: `${(fleetState.available_inventory / fleetState.total_inventory) * 100}%`}}>
                        </div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1.5 flex justify-between">
                        <span>0%</span>
                        <span>100%</span>
                    </div>
                </div>
            ) : (
                <div className="card p-4 sm:p-5 flex items-center justify-center text-slate-600 text-xs sm:text-sm">
                    Awaiting data...
                </div>
            )}
        </div>
    );
});
MetricCards.displayName = 'MetricCards';

export default MetricCards;
