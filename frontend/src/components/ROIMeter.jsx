import React, { memo } from 'react';

const ROIMeter = memo(({ metrics }) => {
    if (!metrics) return null;

    const { total_revenue = 0, hardware_cost = 250000, roi_percentage = 0 } = metrics;
    
    const visualPercentage = Math.min(roi_percentage, 100);
    const isProfitable = roi_percentage >= 100;

    return (
        <div className="panel p-5 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-0.5 ${isProfitable ? 'bg-green-500' : 'bg-orange-500/40'}`} aria-hidden="true"></div>
            
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <svg className={`w-3.5 h-3.5 ${isProfitable ? 'text-green-500' : 'text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Hardware ROI Tracking
                    </h3>
                    <div className="text-2xl font-bold text-white tracking-tight">
                        {roi_percentage.toFixed(2)}%
                    </div>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded-full border ${isProfitable ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-orange-900/20 text-orange-400 border-orange-500/20'}`}>
                    {isProfitable ? 'Profit Core' : 'Recovering Cost'}
                </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1.5 px-0.5">
                    <span>${total_revenue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                    <span>Target: ${(hardware_cost/1000).toFixed(0)}k</span>
                </div>
                
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/40" role="progressbar" aria-valuenow={roi_percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Hardware ROI progress">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isProfitable ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ width: `${Math.max(visualPercentage, 2)}%` }}
                    />
                </div>
            </div>
        </div>
    );
});
ROIMeter.displayName = 'ROIMeter';

export default ROIMeter;
