import { useState, useEffect, useRef } from 'react'
import MetricCards from './components/MetricCards'
import LiveFeed from './components/LiveFeed'
import ROIMeter from './components/ROIMeter'
import PolicyControls from './components/PolicyControls'
import StaticCalculator from './components/StaticCalculator'

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
  const [fleetState, setFleetState] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [isAutoRunning, setIsAutoRunning] = useState(false)

  const runTick = async () => {
    setLoading(true)
    try {
        const response = await fetch('http://localhost:8000/api/tick')
        const data = await response.json()
        setMetrics(data.metrics)
        setFleetState(data.state)
        setFeed(prev => [data, ...prev])
    } catch (err) {
        console.error("Failed to run tick", err)
    } finally {
        setLoading(false)
    }
  }

  // Handle auto-run interval
  useEffect(() => {
    let interval;
    if (isAutoRunning && activeTab === 'simulation') {
        interval = setInterval(() => {
            runTick()
        }, 1500) // 1.5 seconds per tick
    }
    return () => clearInterval(interval)
  }, [isAutoRunning, activeTab])

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

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-accent-500 tracking-tight">
                GPU Pricing Agent
            </h1>
            <p className="text-slate-400 mt-1">Autonomous Deal Desk Simulation</p>
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
                    onClick={runTick}
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
            </div>
        )}
      </header>

      <div className="flex bg-slate-800/50 p-1 rounded-lg w-full md:w-fit mt-[-10px]">
        <button 
          onClick={() => setActiveTab('calculator')}
           className={`px-4 py-2 flex-1 md:flex-none rounded-md text-sm font-semibold transition-all ${activeTab === 'calculator' ? 'bg-accent-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >Static Base Math Calculator</button>
        <button 
          onClick={() => setActiveTab('simulation')}
          className={`px-4 py-2 flex-1 md:flex-none rounded-md text-sm font-semibold transition-all ${activeTab === 'simulation' ? 'bg-primary-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >Live Agent Simulation</button>
      </div>

      {activeTab === 'calculator' ? (
        <StaticCalculator />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 h-full min-h-[600px] animate-fade-in">
            <div className="lg:col-span-1 flex flex-col gap-6">
                <PolicyControls />
            </div>
            
            <div className="lg:col-span-3 flex flex-col gap-6 lg:max-h-[85vh] overflow-hidden">
                <div className="flex flex-col gap-4">
                    <ROIMeter metrics={metrics} />
                    <MetricCards metrics={metrics} fleetState={fleetState} />
                </div>
                
                <div className="glass-panel flex-1 flex flex-col overflow-hidden relative">
                    <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/80 backdrop-blur flex justify-between items-center z-10 sticky top-0">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse-slow shadow-[0_0_10px_rgba(34,197,94,1)]"></span>
                            Live Deal Feed
                        </h2>
                        <span className="text-slate-400 text-sm">{feed.length} Decisions</span>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 scroll-smooth">
                        {feed.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 italic mt-20">
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
      )}
    </div>
  )
}

export default App
