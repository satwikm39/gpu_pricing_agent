import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TimeSeriesChart = ({ data }) => {
    
    // Format tooltip monetary values
    const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="w-full h-full relative flex flex-col group p-2 sm:p-4">
            {/* Background Glow */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

            <div className="flex justify-between items-end mb-4 relative z-10">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        Financial Trajectory
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">Real-time total revenue and fleet utilization.</p>
                </div>
                <div className="flex gap-4">
                     <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="text-xs text-slate-300 font-medium tracking-wide">Revenue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        <span className="text-xs text-slate-300 font-medium tracking-wide">Utilization %</span>
                    </div>
                </div>
            </div>
            
            <div className="w-full h-[250px] cursor-crosshair mt-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis 
                            dataKey="tick" 
                            stroke="#475569" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#64748b' }}
                            tickFormatter={(tick) => `Tick ${tick}`}
                            minTickGap={20}
                        />
                        <YAxis 
                            yAxisId="left" 
                            stroke="#475569" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                        />
                        <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            stroke="#475569" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                            labelStyle={{ color: '#64748b', marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '5 5' }}
                            formatter={(value, name) => {
                                if (name === 'Revenue') return [formatMoney(value), name];
                                return [`${value}%`, 'Utilization'];
                            }}
                            labelFormatter={(label) => `Simulation Tick ${label}`}
                        />
                        <Area 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="revenue" 
                            name="Revenue"
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            isAnimationActive={true}
                            animationDuration={300}
                        />
                         <Area 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="utilization" 
                            name="Utilization"
                            stroke="#10b981" 
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorUtil)"
                            isAnimationActive={true}
                            animationDuration={300}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            {/* Empty State Overlay */}
            {(!data || data.length === 0) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
                    <svg className="w-10 h-10 text-slate-600 mb-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3zm12-3c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3zM3 13v-2" />
                    </svg>
                    <p className="text-slate-400 font-medium">Awaiting Simulation Data</p>
                    <p className="text-slate-500 text-xs mt-1">Run ticks to plot trajectory</p>
                </div>
            )}
        </div>
    );
};

export default TimeSeriesChart;
