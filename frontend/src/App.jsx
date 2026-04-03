import { useState, useEffect, useCallback, useRef } from 'react'
import MetricCards from './components/MetricCards'
import LiveFeed from './components/LiveFeed'
import ROIMeter from './components/ROIMeter'
import PolicyControls from './components/PolicyControls'
import TimeSeriesChart from './components/TimeSeriesChart'
import FleetROIDistribution from './components/FleetROIDistribution'
import AgentSidebar from './components/AgentSidebar'
import PolicyComparisonModal from './components/PolicyComparisonModal'
import WarGamesPanel from './components/WarGamesPanel'

// Read the group ID from the URL query param: ?group=team1
function getGroupId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('group') || 'default';
}

const GROUP_ID = getGroupId();

const TABS = [
  { id: 'policy', label: 'Policy Sandbox', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ), color: 'accent', activeClass: 'bg-accent-600 shadow-[0_4px_20px_rgba(139,92,246,0.4)]' },
  { id: 'simulation', label: 'Simulation', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ), color: 'primary', activeClass: 'bg-primary-600 shadow-[0_4px_20px_rgba(37,99,235,0.4)]' },
  { id: 'wargames', label: 'War Games', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ), color: 'amber', activeClass: 'bg-amber-600 shadow-[0_4px_20px_rgba(217,119,6,0.4)]' },
];

function App() {
  const [activeTab, setActiveTab] = useState('policy')
  const [metrics, setMetrics] = useState({
    total_revenue: 0,
    evictions: 0,
    trust_score: 100,
    rejected_deals: 0,
    hardware_cost: 250000,
    roi_percentage: 0
  })
  const [feed, setFeed] = useState([])
  const [chartData, setChartData] = useState([])
  const [savedRuns, setSavedRuns] = useState([])
  const [lastDealContext, setLastDealContext] = useState(null)
  const [comparisonData, setComparisonData] = useState(null)
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isAutoRunning, setIsAutoRunning] = useState(false)

  const originalDecisionRef = useRef(null) 
  const lastSeenHistoryId = useRef(0);
  const isSyncingRef = useRef(false);

  // Persistent Event Stream: Instead of polling, we open a single long-lived connection.
  // The server "pushes" updates whenever a tick completes or metrics change.
  useEffect(() => {
      let isMounted = true;
      let controller = new AbortController();

      const listenForEvents = async () => {
          try {
              // Standard fetch-based stream reader (same robust logic as tick stream)
              const response = await fetch(`/api/events?group_id=${GROUP_ID}`, {
                  signal: controller.signal
              });
              if (!response.ok) throw new Error("Event stream failed");

              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = '';

              while (isMounted) {
                  const { value, done } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop();

                  for (const line of lines) {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('data: ')) {
                          try {
                              const event = JSON.parse(trimmed.slice(6));
                                if (event.type === 'initial') {
                                    // Someone else started a tick. Switch to thinking mode unless we are the one who started it.
                                    if (!isSyncingRef.current) { // isSyncingRef.current is a good proxy for "are we the initiator"
                                        setAgentStreamData([]); // Reset for new session
                                        setIsThinking(true);
                                        setLastDealContext({ request: event.request, state: event.state });
                                    }
                                } else if (event.type === 'thought') {
                                    // Append thoughts if we didn't start the tick (to avoid duplicates)
                                    if (!isSyncingRef.current) {
                                        setAgentStreamData(prev => [...prev, event]);
                                    }
                                } else if (event.type === 'tick_completed') {
                                    const t = event.tick;
                                    
                                    // Update Metrics
                                    setMetrics(t.metrics);
                                    setIsThinking(false);

                                    // Set context for Replay/Re-run for everyone
                                    setLastDealContext({ request: t.request, state: t.state });
                                    originalDecisionRef.current = {
                                        action: t.decision.action,
                                        finalPrice: t.decision.final_price_per_hour,
                                        explanation: t.decision.explanation,
                                        policies: t.thoughts?.[0]?.thought?.policies || null
                                    };

                                  // Update Feed (prepend if new)
                                  setFeed(prev => {
                                      if (prev.some(p => p._serverId === t.id)) return prev;
                                      lastSeenHistoryId.current = t.id;
                                      return [{
                                          request: t.request,
                                          state: t.state,
                                          decision: t.decision,
                                          metrics: t.metrics,
                                          _serverId: t.id,
                                      }, ...prev];
                                  });

                                  // Update Chart Data
                                  setChartData(prev => {
                                      const st = t.state;
                                      const utilization = st && st.total_inventory > 0
                                          ? ((st.total_inventory - st.available_inventory) / st.total_inventory) * 100
                                          : 0;
                                          
                                      const newPoint = {
                                          tick: (prev.length > 0 ? (prev[prev.length - 1].tick + 1) : 1),
                                          revenue: t.metrics.total_revenue,
                                          utilization: parseFloat(utilization.toFixed(2)),
                                      };
                                      return [...prev, newPoint].slice(-50);
                                  });
                              }
                          } catch (e) {
                              console.error("Event parse error", e);
                          }
                      }
                  }
              }
          } catch (err) {
              if (err.name !== 'AbortError') {
                  console.error("Event stream disconnected, retrying in 5s...", err);
                  if (isMounted) setTimeout(listenForEvents, 5000);
              }
          }
      };

      // Initial Rehydration: Fetch current state once on mount
      const rehydrate = async () => {
          try {
              const [metricsRes, historyRes, activeRes] = await Promise.all([
                  fetch(`/api/metrics?group_id=${GROUP_ID}`),
                  fetch(`/api/history?group_id=${GROUP_ID}`),
                  fetch(`/api/tick/active?group_id=${GROUP_ID}`),
              ]);
              if (metricsRes.ok) setMetrics(await metricsRes.json());
              if (historyRes.ok) {
                  const ticks = await historyRes.json();
                  if (ticks.length > 0) {
                      lastSeenHistoryId.current = ticks[ticks.length - 1].id;
                      setFeed(ticks.map(t => ({
                          request: t.request,
                          state: t.state,
                          decision: t.decision,
                          metrics: t.metrics,
                          _serverId: t.id,
                          thoughts: t.thoughts || []
                      })).reverse());
                      
                      const lastTick = ticks[ticks.length - 1];
                      if (lastTick.thoughts && lastTick.thoughts.length > 0) {
                          // Combine stored initial event with thoughts and final decision for consistent display
                          const displayThoughts = [
                              ...(lastTick.initial ? [lastTick.initial] : []),
                              ...lastTick.thoughts,
                              {
                                  type: 'final_decision',
                                  decision: lastTick.decision,
                                  metrics: lastTick.metrics
                              }
                          ];

                          setAgentStreamData(displayThoughts);
                          setLastDealContext({ request: lastTick.request, state: lastTick.state });
                          
                          // Policies for Re-run come from the initial event of THIS tick
                          const tickPolicies = lastTick.initial?.policies || lastTick.thoughts?.[0]?.thought?.policies || null;
                          
                          originalDecisionRef.current = {
                              action: lastTick.decision.action,
                              finalPrice: lastTick.decision.final_price_per_hour,
                              explanation: lastTick.decision.explanation,
                              policies: tickPolicies
                          };
                      }
                      
                      setChartData(ticks.map((t, i) => {
                          const st = t.state;
                          const utilization = st && st.total_inventory > 0
                              ? ((st.total_inventory - st.available_inventory) / st.total_inventory) * 100
                              : 0;
                          return {
                              tick: i + 1,
                              revenue: t.metrics.total_revenue,
                              utilization: parseFloat(utilization.toFixed(2)),
                          };
                      }).slice(-50));
                  }
              }

              // Check for an in-progress tick (Late Joiner Catch-up)
              if (activeRes.ok) {
                  const active = await activeRes.json();
                  if (active && active.initial) {
                      setLastDealContext({ request: active.initial.request, state: active.initial.state });
                      setAgentStreamData(active.thoughts || []);
                      setIsThinking(true);
                  }
              }
          } catch (e) {
              console.error("Rehydration failed", e);
          }
      };

      rehydrate();
      listenForEvents();

      return () => {
          isMounted = false;
          controller.abort();
      };
  }, []); // Only run once on mount! No more interval loops.

  const [agentStreamData, setAgentStreamData] = useState([])

  // Robust line-by-line SSE Processor
  const processStream = async (url, options = {}, onMessage) => {
    setLoading(true);
    setIsThinking(true);
    setAgentStreamData([]);
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            // Look for individual data lines (standard SSE format)
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep partial line

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    if (!jsonStr) continue;
                    try {
                        const data = JSON.parse(jsonStr);
                        onMessage(data);
                    } catch (e) {
                        console.error("SSE parse error", e, jsonStr);
                    }
                }
            }
        }
        
        // Process any leftover buffer if the stream closes without a final newline
        if (buffer.trim().startsWith('data: ')) {
            try {
                const data = JSON.parse(buffer.trim().slice(6));
                onMessage(data);
            } catch (e) {}
        }
    } catch (err) {
        console.error("Stream reader failed", err);
    } finally {
        setLoading(false);
        setIsThinking(false);
    }
  };

  const runTickStream = useCallback(async () => {
    if (loading || isThinking) return;

    setComparisonOpen(false);
    setComparisonData(null);
    originalDecisionRef.current = null;
    isSyncingRef.current = true; // Mark that WE are the initiator

    await processStream(`/api/tick/stream?group_id=${GROUP_ID}`, {}, (data) => {
        setAgentStreamData(prev => [...prev, data]);
        
        if (data.type === 'final_decision') {
            setMetrics(data.metrics);
            // We use the function form of setAgentStreamData, so we need to look back at the accumulated state for decision mapping
            setAgentStreamData(current => {
                 if (data.type === 'final_decision' && !data.is_replay) {
                    const initialEvent = current.find(d => d.type === 'initial');
                    if (initialEvent) {
                        setLastDealContext({ request: initialEvent.request, state: initialEvent.state });
                        originalDecisionRef.current = {
                            action: data.decision.action,
                            finalPrice: data.decision.final_price_per_hour,
                            explanation: data.decision.explanation,
                            policies: initialEvent.policies || null 
                        };
                    }
                 }
                 return current;
            });
        }
    });
    isSyncingRef.current = false;
  }, [loading, isThinking]);

  const handleReplay = useCallback(async (policyOverrides) => {
    if (!lastDealContext || loading || isThinking) return;

    await processStream(`/api/tick/replay?group_id=${GROUP_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            request: lastDealContext.request,
            state: lastDealContext.state,
            policy_overrides: policyOverrides
        })
    }, (data) => {
        setAgentStreamData(prev => [...prev, data]);
        
        if (data.type === 'final_decision' && data.is_replay) {
            setAgentStreamData(current => {
                const initialEvent = current.find(d => d.type === 'initial');
                setComparisonData({
                    dealRequest: lastDealContext.request,
                    original: originalDecisionRef.current || {},
                    replay: {
                        action: data.decision.action,
                        finalPrice: data.decision.final_price_per_hour,
                        explanation: data.decision.explanation,
                        policies: initialEvent?.replay_policies || policyOverrides
                    }
                });
                return current;
            });
        }
    });
  }, [lastDealContext, loading, isThinking]);

  const handleExecuteCounterOffer = useCallback(async (newPrice) => {
    if (!lastDealContext || loading || isThinking) return;

    const modifiedRequest = { ...lastDealContext.request, bid_price_per_hour: parseFloat(newPrice) };
    isSyncingRef.current = true;

    await processStream(`/api/tick/execute?group_id=${GROUP_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: modifiedRequest, state: lastDealContext.state })
    }, (data) => {
        setAgentStreamData(prev => [...prev, data]);
        if (data.type === 'final_decision') {
            setMetrics(data.metrics);
            setIsThinking(false);
        }
    });
    isSyncingRef.current = false;
  }, [lastDealContext, loading, isThinking]);

  // Handle auto-run interval
  useEffect(() => {
    let interval;
    if (isAutoRunning && activeTab === 'simulation' && !loading && !isThinking) {
        interval = setInterval(() => {
            runTickStream()
        }, 5000) 
    }
    return () => clearInterval(interval)
  }, [isAutoRunning, activeTab, loading, isThinking, runTickStream])


  const saveCurrentRun = async () => {
      if (feed.length === 0) return;
      const runName = `Run ${savedRuns.length + 1} (${feed.length} Ticks)`;
      const newRun = { name: runName, metrics: { ...metrics }, chartData: [...chartData] };
      setSavedRuns(prev => [...prev, newRun]);
      
      setFeed([]);
      setChartData([]);
      lastSeenHistoryId.current = 0;
      try {
          await fetch(`/api/metrics/reset?group_id=${GROUP_ID}`, { method: 'POST' });
          const response = await fetch(`/api/metrics?group_id=${GROUP_ID}`)
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
            <div className="flex items-center gap-3 mt-1">
                <p className="text-slate-400 uppercase tracking-widest text-xs font-semibold">Autonomous Deal Desk Simulation</p>
                {GROUP_ID !== 'default' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-600/20 text-primary-300 border border-primary-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"></span>
                        {GROUP_ID}
                    </span>
                )}
                <button 
                  onClick={async () => {
                    if (window.confirm(`Reset ALL data for group "${GROUP_ID}"?`)) {
                      await fetch(`/api/metrics/reset?group_id=${GROUP_ID}`, { method: 'POST' });
                      window.location.reload();
                    }
                  }}
                  className="ml-auto px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-red-400 hover:text-white border border-red-500/30 hover:bg-red-500/20 rounded transition-all duration-300"
                >
                  Reset Simulation
                </button>
            </div>
        </div>
      </header>

      <div className="flex bg-slate-800/40 p-1.5 rounded-xl w-full md:w-fit border border-white/5 backdrop-blur-md">
        {TABS.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 flex-1 md:flex-none rounded-lg text-sm font-bold tracking-wide transition-all flex items-center gap-2 ${activeTab === tab.id ? `${tab.activeClass} text-white` : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'policy' && <PolicyControls />}

      {activeTab === 'simulation' && (
        <div className="flex flex-col gap-5 animate-fade-in w-full">
            <div className="glass-panel p-4 flex flex-wrap items-center gap-3">
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
                            Simulating...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Manual Tick
                        </>
                    )}
                </button>
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
                <div className="w-px h-8 bg-slate-700 mx-1 self-center hidden sm:block"></div>
                <button 
                    onClick={saveCurrentRun}
                    disabled={feed.length === 0 || isAutoRunning}
                    className="px-4 py-2 sm:px-4 sm:py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Run
                </button>
            </div>

            <div className="glass-panel w-full p-5 glow-top">
                <div className="flex flex-col lg:flex-row gap-5 items-center">
                    <div className="w-full lg:w-1/3 shrink-0"><ROIMeter metrics={metrics} /></div>
                    <div className="w-full lg:w-2/3"><MetricCards metrics={metrics} /></div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-5 w-full items-start">
                <div className="flex-1 flex flex-col gap-5 w-full">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full shrink-0">
                        <div className="glass-panel p-1 sm:p-3 min-h-[380px] flex flex-col"><TimeSeriesChart data={chartData} /></div>
                        <div className="glass-panel p-1 sm:p-3 min-h-[380px] flex flex-col"><FleetROIDistribution /></div>
                    </div>
                    <div className="glass-panel w-full flex-col flex flex-1 mt-0 glow-top min-h-[500px]">
                        <div className="px-6 py-4 border-b border-white/10 bg-slate-900/60 flex justify-between items-center z-10 sticky top-0">
                            <h2 className="text-xl font-display font-bold flex items-center gap-3 text-white">Executive Live Deal Feed</h2>
                            <span className="text-slate-400 text-sm font-semibold uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">{feed.length} Decisions</span>
                        </div>
                        <div className="p-6 flex flex-col gap-6 min-h-[400px]">
                            {feed.map((tick, idx) => (
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
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="w-full xl:w-[420px] 2xl:w-[480px] shrink-0 h-full z-30">
                    <AgentSidebar 
                        streamData={agentStreamData} 
                        isThinking={isThinking}
                        lastDealContext={lastDealContext}
                        onReplay={handleReplay}
                        onExecuteCounterOffer={handleExecuteCounterOffer}
                        onViewComparison={() => setComparisonOpen(true)}
                        hasComparison={!!comparisonData}
                    />
                </div>
            </div>
        </div>
      )}

      {activeTab === 'wargames' && (
        <WarGamesPanel
            savedRuns={savedRuns}
            onClearRuns={() => setSavedRuns([])}
            onSaveRun={saveCurrentRun}
            canSave={feed.length > 0 && !isAutoRunning}
            isAutoRunning={isAutoRunning}
        />
      )}

      <PolicyComparisonModal 
          isOpen={comparisonOpen}
          onClose={() => setComparisonOpen(false)}
          comparison={comparisonData}
      />
    </div>
  )
}

export default App
