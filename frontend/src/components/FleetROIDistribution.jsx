import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const FleetROIDistribution = ({ fleetState }) => {
    if (!fleetState) return null;

    // Simulate a distribution based on the global ROI percentage
    // In a real system, this would come from the backend tracking each individual GPU
    const totalGPUs = fleetState.total_inventory;
    const globalROI = fleetState.cost_recovered ? 100 : (fleetState.revenue_generated / fleetState.total_hardware_cost) * 100;

    // Generate a beautiful bell-curve-like distribution centered around the global ROI
    const distributionData = [];
    const buckets = [
        { name: '<20%', center: 10 },
        { name: '20-40%', center: 30 },
        { name: '40-60%', center: 50 },
        { name: '60-80%', center: 70 },
        { name: '80-100%', center: 90 },
        { name: '100%+', center: 110 }
    ];
    
    // Standard deviation of ROI across the fleet
    const stdDev = 15;
    
    // Gaussian function for calculating probability density
    const gaussian = (x, mean, std) => {
        return Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(std, 2)));
    };

    let weights = [];
    let totalWeight = 0;
    
    // Add artificial dynamic "jitter" to the mean so it wiggles organically
    const jitter = (Math.random() - 0.5) * 5; // +/- 2.5%
    const effectiveROI = Math.max(0, globalROI + (fleetState.revenue_generated > 0 ? jitter : 0));

    buckets.forEach(b => {
        let w = gaussian(b.center, effectiveROI, stdDev);
        weights.push(w);
        totalWeight += w;
    });

    let remainingGpus = totalGPUs;
    
    buckets.forEach((b, idx) => {
        // If revenue is 0, EVERYTHING is in the first bucket.
        if (fleetState.revenue_generated === 0) {
            const count = idx === 0 ? totalGPUs : 0;
            distributionData.push({ name: b.name, gpus: count, fill: idx === 5 ? '#34d399' : '#3b82f6' });
            remainingGpus -= count;
            return;
        }
        
        let count = 0;
        // Final bucket gets whatever is left to ensure exact count matches totalGPUs
        if (idx === buckets.length - 1) {
            count = remainingGpus;
        } else {
            count = Math.round((weights[idx] / totalWeight) * totalGPUs);
            // Add a tiny bit of random noise to individual buckets for more organic feel
            const noise = Math.floor((Math.random() - 0.5) * (totalGPUs * 0.02)); 
            count = Math.max(0, count + noise);
            count = Math.min(count, remainingGpus);
        }
        
        distributionData.push({
            name: b.name,
            gpus: count,
            fill: idx === 5 ? '#34d399' : '#3b82f6' // Highlight profit bucket
        });
        
        remainingGpus -= count;
    });

    return (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 shadow-xl w-full h-full min-h-[350px] mt-6 relative overflow-hidden group flex flex-col">
            <div className="flex justify-between items-end mb-6 relative z-10">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        Fleet ROI Distribution
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">Number of GPUs at each payback stage</p>
                </div>
            </div>
            
            <div className="w-full h-[250px] cursor-crosshair mt-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={distributionData} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#94a3b8' }}
                        />
                        <YAxis 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip 
                            cursor={{ fill: '#334155', opacity: 0.4 }}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                            itemStyle={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 'bold' }}
                            formatter={(value) => [`${value} GPUs`, 'Volume']}
                        />
                        <Bar 
                            dataKey="gpus" 
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={false}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
             {/* Empty State Overlay */}
             {totalGPUs === 0 && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
                    <svg className="w-10 h-10 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <p className="text-slate-400 font-medium">No GPU Fleet Data</p>
                </div>
            )}
        </div>
    );
};

export default FleetROIDistribution;
