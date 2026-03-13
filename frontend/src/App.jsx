import { useState, useEffect, useCallback } from 'react'
import MetricCards from './components/MetricCards'
import LiveFeed from './components/LiveFeed'
import ROIMeter from './components/ROIMeter'
import PolicyControls from './components/PolicyControls'
import TimeSeriesChart from './components/TimeSeriesChart'
import FleetROIDistribution from './components/FleetROIDistribution'
import AgentSidebar from './components/AgentSidebar'

function App() {
  const [activeTab, setActiveTab] = useState('simulation') // 'simulation' or 'calculator'
  const [metrics, setMetrics] = useState({
    total_revenue: 0,
    evictions: 0,
    trust_score: 100,
    rejected_deals: 0,
    hardware_cost: 250000,
    roi_percentage: 0
  })
  const [feed, setFeed] = useState([])

  const [fleetState] = useState(null)
  const [chartData, setChartData] = useState([]) // Historical data for Recharts
  const [savedRuns, setSavedRuns] = useState([]) // Array of saved scenario runs
  const [notifications] = useState([]) // Toast notifications
  const [lastDealContext, setLastDealContext] = useState(null) // Stores last {request, state} for policy replay
  
  const [loading, setLoading] = useState(false)
  const [isAutoRunning, setIsAutoRunning] = useState(false)

  // Auto-reset metrics on initial page load
  useEffect(() => {
      const resetOnLoad = async () => {
          try {
              await fetch('http://localhost:8000/api/metrics/reset', { method: 'POST' });
              const response = await fetch('http://localhost:8000/api/metrics');
              const data = await response.json();
              setMetrics(data);
          } catch (err) {
              console.error("Failed to reset metrics on load", err);
          }
      };
      resetOnLoad();
  }, []);

  const [agentStreamData, setAgentStreamData] = useState([]) // SSE data
  const [isThinking, setIsThinking] = useState(false)

  const runTickStream = useCallback(async () => {
    if (loading || isThinking) return;
    
    setLoading(true)
    setIsThinking(true)
    setAgentStreamData([])
    let currentStream = [];
    
    try {
        const response = await fetch('http://localhost:8000/api/tick/stream');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        // Wait to process the chunks
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '');
                    if (dataStr.trim() === '') continue;
                    
                    try {
                        const data = JSON.parse(dataStr);
                        
                        currentStream.push(data);
                        setAgentStreamData([...currentStream]);
                        
                        if (data.type === 'final_decision') {
                            setMetrics(data.metrics);
                            
                            // Reconstruct the legacy 'tick' object for Live Feed compatibility
                            const mockTick = {
                                request: currentStream.find(d => d.type === 'initial')?.request || {},
                                state: currentStream.find(d => d.type === 'initial')?.state || {},
                                decision: data.decision,
                                metrics: data.metrics
                            };
                            
                            // Capture the last deal context for policy re-run feature
                            const initialEvent = currentStream.find(d => d.type === 'initial');
                            if (initialEvent && !data.is_replay) {
                                setLastDealContext({
                                    request: initialEvent.request,
                                    state: initialEvent.state
                                });
                            }
                            
                            // Don't add replay runs to the Live Feed, only real ticks
                            if (!data.is_replay) {
                                setFeed(prev => [mockTick, ...prev]);
                            }
                            
                            setChartData(prev => {
                                const st = mockTick.state;
                                const utilization = st && st.total_inventory > 0 
                                    ? ((st.total_inventory - st.available_inventory) / st.total_inventory) * 100 
                                    : 0;
                                const newPoint = {
                                    tick: prev.length + 1,
                                    revenue: data.metrics.total_revenue,
                                    utilization: parseFloat(utilization.toFixed(2))
                                };
                                return [...prev, newPoint].slice(-50);
                            });
                        }
                    } catch (e) {
                         console.error("Parse error on chunk", e);
                    }
                }
            }
        }
    } catch (err) {
        console.error("Failed to run tick stream", err)
    } finally {
        setLoading(false)
        setIsThinking(false)
    }
  }, [loading, isThinking]);

  const handleReplay = useCallback(async (policyOverrides) => {
    if (!lastDealContext || loading || isThinking) return;

    setLoading(true);
    setIsThinking(true);
    setAgentStreamData([]);
    let currentStream = [];

    try {
        const response = await fetch('http://localhost:8000/api/tick/replay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                request: lastDealContext.request,
                state: lastDealContext.state,
                policy_overrides: policyOverrides
            })
        });

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const dataStr = line.replace('data: ', '').trim();
                if (!dataStr) continue;
                try {
                    const data = JSON.parse(dataStr);
                    currentStream.push(data);
                    setAgentStreamData([...currentStream]);
                } catch (e) { console.error('Parse error on replay chunk', e); }
            }
        }
    } catch (err) {
        console.error('Replay failed', err);
    } finally {
        setLoading(false);
        setIsThinking(false);
    }
  }, [lastDealContext, loading, isThinking]);

  // Handle auto-run interval
  useEffect(() => {
    let interval;
    if (isAutoRunning && activeTab === 'simulation') {
        interval = setInterval(() => {
            runTickStream()
        }, 3000) // 3 seconds per tick to allow reading the agents
    }
    return () => clearInterval(interval)
  }, [isAutoRunning, activeTab, isThinking, loading, runTickStream])

  useEffect(() => {
    const fetchInitial = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/metrics')
            const data = await response.json()
            setMetrics(data)
        } catch (err) {
            console.error(err)
        }
    }
    fetchInitial()
  }, [])

  const saveCurrentRun = async () => {
      if (feed.length === 0) return;
      const runName = `Run ${savedRuns.length + 1} (${feed.length} Ticks)`;
      const newRun = {
          name: runName,
          metrics: { ...metrics },
          chartData: [...chartData]
      };
      setSavedRuns(prev => [...prev, newRun]);
      
      // Reset current active simulation
      setFeed([]);
      setChartData([]);
      try {
          // Tell the backend to reset the metrics tracking counters
          await fetch('http://localhost:8000/api/metrics/reset', { method: 'POST' });
          const response = await fetch('http://localhost:8000/api/metrics')
          const data = await response.json()
          setMetrics(data)
      } catch (err) {
          console.error("Failed to reset backend metrics", err);
      }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-6 w-full flex flex-col gap-5 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-0 shrink-0">
        <div className="flex flex-col">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-primary-500 to-accent-400 tracking-tight font-display drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                GPU Pricing Agent
            </h1>
            <p className="text-slate-400 mt-1 uppercase tracking-widest text-xs font-semibold">Autonomous Deal Desk Simulation</p>
        </div>
        
        {activeTab === 'simulation' && (
            <div className="flex gap-3">
                <button 
                    onClick={() => setIsAutoRunning(!isAutoRunning)}
                    className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 shadow-md ${isAutoRunning ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                >
                    {isAutoRunning ? (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Stop Auto
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Auto Run
                        </>
                    )}
                </button>
                <button 
                    onClick={runTickStream}
                    disabled={loading || isAutoRunning}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all duration-300 flex items-center gap-2"
                >
                    {loading && !isAutoRunning ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="hidden sm:inline">Simulating...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="hidden sm:inline">Manual Tick</span>
                        </>
                    )}
                </button>
                <div className="w-px h-8 bg-slate-700 mx-1 self-center hidden sm:block"></div>
                <button 
                    onClick={saveCurrentRun}
                    disabled={feed.length === 0 || isAutoRunning}
                    className="px-4 py-2 sm:px-4 sm:py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save current metrics and reset simulation"
                >
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span className="hidden sm:inline">Save Run</span>
                </button>
                {savedRuns.length > 0 && (
                    <button 
                        onClick={() => setActiveTab('runs')}
                        className="px-4 py-2 sm:px-4 sm:py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 relative"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="hidden sm:inline">Compare</span>
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg border border-slate-900">{savedRuns.length}</div>
                    </button>
                )}
            </div>
        )}
      </header>

      <div className="flex bg-slate-800/40 p-1.5 rounded-xl w-full md:w-fit mt-[-10px] border border-white/5 backdrop-blur-md">
        <button 
          onClick={() => setActiveTab('simulation')}
          className={`px-5 py-2.5 flex-1 md:flex-none rounded-lg text-sm font-bold tracking-wide transition-all ${activeTab === 'simulation' ? 'bg-primary-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >Live Agent Simulation</button>
        <button 
          onClick={() => setActiveTab('runs')}
          className={`px-5 py-2.5 flex-1 md:flex-none rounded-lg text-sm font-bold tracking-wide transition-all ${activeTab === 'runs' ? 'bg-accent-600 text-white shadow-[0_4px_20px_rgba(124,58,237,0.4)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'} ${savedRuns.length === 0 ? 'hidden' : ''}`}
        >Scenario Comparisons ({savedRuns.length})</button>
      </div>

      {activeTab === 'runs' ? (
        <div className="flex flex-col gap-6 animate-fade-in w-full max-w-7xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-white mb-2">Saved Scenarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {savedRuns.map((run, idx) => (
                    <div key={idx} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden group">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        <h3 className="text-lg font-bold text-white flex justify-between items-center">
                            {run.name}
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30">ROI: {run.metrics.roi_percentage.toFixed(1)}%</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Rev</p>
                                <p className="text-blue-400 font-mono font-bold text-lg">${run.metrics.total_revenue.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Trust Score</p>
                                <p className={`${run.metrics.trust_score >= 80 ? 'text-green-400' : run.metrics.trust_score >= 50 ? 'text-yellow-400' : 'text-red-400'} font-mono font-bold text-lg`}>{run.metrics.trust_score.toFixed(1)}/100</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Evicted</p>
                                <p className="text-orange-400 font-mono font-bold text-lg">{run.metrics.evictions}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Rejected</p>
                                <p className="text-red-400 font-mono font-bold text-lg">{run.metrics.rejected_deals}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {savedRuns.length > 0 && (
                <div className="mt-4">
                    <button onClick={() => setSavedRuns([])} className="text-sm text-red-500 hover:text-red-400 transition-colors flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Clear All Saved Runs
                    </button>
                </div>
            )}
        </div>
      ) : (
        <div className="flex flex-col gap-5 animate-fade-in w-full">
            
            {/* Command Center: High-Level Executive Dashboard */}
            <div className="glass-panel w-full p-5 glow-top">
                <div className="flex flex-col lg:flex-row gap-5 items-center">
                    <div className="w-full lg:w-1/3 shrink-0">
                        <ROIMeter metrics={metrics} />
                    </div>
                    <div className="w-full lg:w-2/3">
                        <MetricCards metrics={metrics} fleetState={fleetState} />
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-5 w-full items-start">
                {/* Main Content: Left Column (Controls) & Middle Column (Feed) */}
                <div className="flex-1 flex flex-col xl:flex-row gap-5 w-full">
                    {/* Left Column: Policy Controls */}
                    <div className="w-full xl:w-[360px] flex flex-col gap-5 shrink-0">
                        <PolicyControls />
                    </div>

                    {/* Middle Column: Live Feed & Analytics */}
                    <div className="flex-1 flex flex-col gap-5">
                        
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full shrink-0">
                            <div className="glass-panel p-1 sm:p-3 min-h-[380px] flex flex-col">
                                <TimeSeriesChart data={chartData} />
                            </div>
                            <div className="glass-panel p-1 sm:p-3 min-h-[380px] flex flex-col">
                                <FleetROIDistribution fleetState={fleetState} />
                            </div>
                        </div>

                        {/* Bottom Section: Live Feed */}
                        <div className="glass-panel w-full flex-col flex flex-1 mt-0 glow-top min-h-[500px]">
                            <div className="px-6 py-4 border-b border-white/10 bg-slate-900/60 flex justify-between items-center z-10 sticky top-0">
                                <h2 className="text-xl font-display font-bold flex items-center gap-3 text-white">
                                    <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500 shadow-[0_0_15px_rgba(59,130,246,1)]"></span>
                                    </span>
                                    Executive Live Deal Feed
                                </h2>
                                <span className="text-slate-400 text-sm font-semibold uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">{feed.length} Decisions</span>
                            </div>
                            <div className="p-6 flex flex-col gap-6 min-h-[400px]">
                                {feed.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-slate-500 italic mt-10">
                                        No data yet. Click "Run Next Tick" to generate simulated requests.
                                    </div>
                                ) : (
                                    feed.map((tick, idx) => (
                                        <div key={idx} className="flex flex-col gap-6 w-full">
                                            <LiveFeed data={tick} />
                                            {idx < feed.length - 1 && (
                                                <div className="flex items-center w-full px-4 sm:px-12 opacity-50 py-1">
                                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-500 to-slate-500"></div>
                                                    <div className="mx-4 w-1.5 h-1.5 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.8)]"></div>
                                                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-500 to-slate-500"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Right Column: Agent Reasoning Sidebar */}
                <div className="w-full xl:w-[420px] 2xl:w-[480px] shrink-0 h-full z-30">
                    <AgentSidebar 
                        streamData={agentStreamData} 
                        isThinking={isThinking}
                        lastDealContext={lastDealContext}
                        onReplay={handleReplay}
                    />
                </div>
            </div>
        </div>
      )}

      {/* Notification Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
          {notifications.map(n => (
              <div key={n.id} className="bg-emerald-500/90 text-white px-5 py-4 rounded-xl shadow-[0_10px_40px_rgba(16,185,129,0.3)] backdrop-blur-md flex items-center gap-3 animate-slide-up border border-emerald-400">
                  <div className="bg-emerald-400/20 p-1.5 rounded-full flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                  </div>
                  <span className="font-medium text-sm tracking-wide">
                      Leases expired: <span className="font-bold text-white">+{n.freed} GPUs</span> returned to pool.
                  </span>
              </div>
          ))}
      </div>
    </div>
  )
}

export default App
