import React, { memo } from 'react';

const MetricCards = memo(({ metrics, fleetState }) => {
    const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="card p-4 sm:p-5 relative overflow-hidden">
                <p className="text-slate-400 text-xs mb-1">Revenue</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight tabular-nums">{formatMoney(metrics.total_revenue)}</p>
            </div>

            <div className="card p-4 sm:p-5 relative overflow-hidden">
                <p className="text-slate-400 text-xs mb-1">Trust Score</p>
                <div className="flex items-baseline gap-1.5">
                    <p className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums ${metrics.trust_score < 80 ? 'text-red-400' : 'text-white'}`}>{metrics.trust_score}</p>
                    <p className="text-sm text-slate-500">/ 100</p>
                </div>
                {metrics.trust_score < 80 && (
                    <p className="text-xs text-red-500 mt-1" role="alert">SLA at risk</p>
                )}
            </div>

            <div className="card p-4 sm:p-5 relative overflow-hidden flex flex-col justify-center">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <p className="text-slate-400 text-xs mb-0.5">Evicted</p>
                        <p className="text-lg sm:text-xl font-bold text-red-400 tabular-nums">{metrics.evictions}</p>
                    </div>
                    <div className="w-px bg-slate-700/40" aria-hidden="true"></div>
                    <div className="flex-1">
                        <p className="text-slate-400 text-xs mb-0.5">Rejected</p>
                        <p className="text-lg sm:text-xl font-bold text-slate-300 tabular-nums">{metrics.rejected_deals}</p>
                    </div>
                </div>
            </div>

            {fleetState ? (
                <div className="card p-4 sm:p-5 flex flex-col justify-center">
                    <div className="text-slate-400 text-xs mb-1.5 flex justify-between">
                        <span>Fleet</span>
                        <span className="tabular-nums">{fleetState.available_inventory}/{fleetState.total_inventory}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/40" role="progressbar" aria-valuenow={fleetState.available_inventory} aria-valuemin={0} aria-valuemax={fleetState.total_inventory} aria-label="Fleet availability">
                        <div 
                            className={`h-full ${fleetState.available_inventory < (fleetState.total_inventory * 0.15) ? 'bg-red-500' : 'bg-green-500'} transition-all duration-700 ease-out`} 
                            style={{width: `${(fleetState.available_inventory / fleetState.total_inventory) * 100}%`}}>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5 flex justify-between tabular-nums">
                        <span>0%</span>
                        <span>100%</span>
                    </div>
                </div>
            ) : (
                <div className="card p-4 sm:p-5 flex items-center justify-center text-slate-600 text-sm">
                    Awaiting data...
                </div>
            )}
        </div>
    );
});
MetricCards.displayName = 'MetricCards';

export default MetricCards;
