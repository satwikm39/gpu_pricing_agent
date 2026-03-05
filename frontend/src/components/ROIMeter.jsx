import React from 'react';

const ROIMeter = ({ metrics }) => {
    if (!metrics) return null;

    const { total_revenue = 0, hardware_cost = 250000, roi_percentage = 0 } = metrics;
    
    // Cap at 100 for the visual bar
    const visualPercentage = Math.min(roi_percentage, 100);
    const isProfitable = roi_percentage >= 100;

    return (
        <div className="glass-panel p-5 relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-full h-1 ${isProfitable ? 'bg-green-500' : 'bg-orange-500/50'}`}></div>
            
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <svg className={`w-3.5 h-3.5 ${isProfitable ? 'text-green-500' : 'text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Hardware ROI Tracking
                    </h3>
                    <div className="text-2xl font-bold text-white tracking-tight">
                        {roi_percentage.toFixed(2)}%
                    </div>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded-full border ${isProfitable ? 'bg-green-900/30 text-green-400 border-green-500/30' : 'bg-orange-900/30 text-orange-400 border-orange-500/30'}`}>
                    {isProfitable ? 'Profit Core' : 'Recovering Cost'}
                </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1.5 px-0.5">
                    <span>${total_revenue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                    <span>Target: ${(hardware_cost/1000).toFixed(0)}k</span>
                </div>
                
                {/* Progress Bar Container */}
                <div className="w-full h-2.5 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700/50">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${isProfitable ? 'bg-green-500' : 'bg-gradient-to-r from-orange-600 to-orange-400'}`}
                        style={{ width: `${Math.max(visualPercentage, 2)}%` }} // Minimum 2% so it's visible
                    >
                        {/* Shimmer effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-white/20 -skew-x-12 translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ROIMeter;
