import { useState, useEffect, useCallback, useRef, lazy, Suspense, memo } from 'react'
import MetricCards from './components/MetricCards'
import LiveFeed from './components/LiveFeed'
import ROIMeter from './components/ROIMeter'
import ChatbotPlayground from './components/ChatbotPlayground'
import AgentSidebar from './components/AgentSidebar'
import PolicyComparisonModal from './components/PolicyComparisonModal'

const PolicyControls = lazy(() => import('./components/PolicyControls'))
const WarGamesPanel = lazy(() => import('./components/WarGamesPanel'))

const MAX_FEED_ITEMS = 50;

function getGroupId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('group') || 'default';
}

const GROUP_ID = getGroupId();

function getAdminKey() {
  const params = new URLSearchParams(window.location.search);
  return params.get('admin');
}

const ADMIN_KEY = getAdminKey();

const TABS = [
  { id: 'policy', label: 'Policy Sandbox', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) },
  { id: 'simulation', label: 'Simulation', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ) },
  { id: 'wargames', label: 'War Games', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ) },
];

const TabButton = memo(({ tab, isActive, onClick }) => (
  <button
    role="tab"
    id={`tab-${tab.id}`}
    aria-selected={isActive}
    aria-controls={`tabpanel-${tab.id}`}
    onClick={onClick}
    className={`px-5 py-2.5 flex-1 md:flex-none rounded-lg text-sm font-semibold tracking-wide transition-colors flex items-center gap-2 ${
      isActive
        ? 'bg-slate-700 text-white shadow-sm'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    }`}
  >
    {tab.icon}
    {tab.label}
  </button>
));
TabButton.displayName = 'TabButton';

const LazyFallback = () => (
  <div className="flex items-center justify-center py-20 text-slate-500 text-sm">Loading...</div>
);

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
  const [savedRuns, setSavedRuns] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [lastDealContext, setLastDealContext] = useState(null)
  const [comparisonData, setComparisonData] = useState(null)
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isAutoRunning, setIsAutoRunning] = useState(false)
  const [adminData, setAdminData] = useState(null)

  const originalDecisionRef = useRef(null) 
  const lastSeenHistoryId = useRef(0);
  const isSyncingRef = useRef(false);

  useEffect(() => {
      let isMounted = true;
      let controller = new AbortController();

      const listenForEvents = async () => {
          try {
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
                                    if (!isSyncingRef.current) {
                                        setAgentStreamData([]);
                                        setIsThinking(true);
                                        setLastDealContext({ request: event.request, state: event.state });
                                        setChatMessages([]);
                                    }
                                } else if (event.type === 'thought') {
                                    if (!isSyncingRef.current) {
                                        setAgentStreamData(prev => [...prev, event]);
                                    }
                                } else if (event.type === 'tick_completed') {
                                    const t = event.tick;
                                    
                                    setMetrics(t.metrics);
                                    setIsThinking(false);

                                    setLastDealContext({ request: t.request, state: t.state });
                                    originalDecisionRef.current = {
                                        action: t.decision.action,
                                        finalPrice: t.decision.final_price_per_hour,
                                        explanation: t.decision.explanation,
                                        policies: t.thoughts?.[0]?.thought?.policies || null
                                    };

                                  setFeed(prev => {
                                      if (prev.some(p => p._serverId === t.id)) return prev;
                                      lastSeenHistoryId.current = t.id;
                                      const next = [{
                                          request: t.request,
                                          state: t.state,
                                          decision: t.decision,
                                          metrics: t.metrics,
                                          _serverId: t.id,
                                      }, ...prev];
                                      return next.slice(0, MAX_FEED_ITEMS);
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
                      })).reverse().slice(0, MAX_FEED_ITEMS));
                      
                      const lastTick = ticks[ticks.length - 1];
                      if (lastTick.thoughts && lastTick.thoughts.length > 0) {
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
                          setChatMessages([]);
                          
                          const tickPolicies = lastTick.initial?.policies || lastTick.thoughts?.[0]?.thought?.policies || null;
                          
                          originalDecisionRef.current = {
                              action: lastTick.decision.action,
                              finalPrice: lastTick.decision.final_price_per_hour,
                              explanation: lastTick.decision.explanation,
                              policies: tickPolicies
                          };
                      }
                  }
              }

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
  }, []);

  useEffect(() => {
    if (!ADMIN_KEY) return;
    
    let isMounted = true;
    const fetchAdmin = async () => {
        try {
            const res = await fetch(`/api/admin/simulator?group_id=${GROUP_ID}&key=${ADMIN_KEY}`);
            if (res.ok) {
                const data = await res.json();
                if (isMounted) setAdminData(data);
            }
        } catch (e) {
            console.error("Admin fetch failed", e);
        }
    };
    
    fetchAdmin();
    const interval = setInterval(fetchAdmin, 5000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [])

  const [agentStreamData, setAgentStreamData] = useState([])

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
            
            const lines = buffer.split('\n');
            buffer = lines.pop();

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
    isSyncingRef.current = true;

    await processStream(`/api/tick/stream?group_id=${GROUP_ID}`, {}, (data) => {
        setAgentStreamData(prev => [...prev, data]);
        
        if (data.type === 'initial') {
            setLastDealContext({ request: data.request, state: data.state });
            setChatMessages([]);
        }
        
        if (data.type === 'final_decision') {
            setMetrics(data.metrics);
            setAgentStreamData(current => {
                 if (data.type === 'final_decision' && !data.is_replay) {
                    const initialEvent = current.find(d => d.type === 'initial');
                    if (initialEvent) {
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

  const handleExecuteCounterOffer = useCallback(async (newPrice, gpuModel = null) => {
    if (!lastDealContext || loading || isThinking) return;

    const modifiedRequest = { ...lastDealContext.request, bid_price_per_hour: parseFloat(newPrice) };
    const modifiedState = { ...lastDealContext.state };

    if (gpuModel) {
        modifiedRequest.gpu_type = gpuModel;
        modifiedState.gpu_type = gpuModel;
        modifiedState.cost_recovered = true;
    }
    
    isSyncingRef.current = true;

    await processStream(`/api/tick/execute?group_id=${GROUP_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: modifiedRequest, state: modifiedState })
    }, (data) => {
        setAgentStreamData(prev => [...prev, data]);
        
        if (data.type === 'initial') {
            setLastDealContext({ request: data.request, state: data.state });
            setChatMessages([]);
        }
        
        if (data.type === 'final_decision') {
            setMetrics(data.metrics);
            setIsThinking(false);
        }
    });
    isSyncingRef.current = false;
  }, [lastDealContext, loading, isThinking]);

  const handleRunScenario = useCallback(async (request, state) => {
    if (loading || isThinking) return;

    isSyncingRef.current = true;
    setActiveTab('simulation');

    await processStream(`/api/tick/execute?group_id=${GROUP_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, state })
    }, (data) => {
        setAgentStreamData(prev => [...prev, data]);
        
        if (data.type === 'initial') {
            setLastDealContext({ request: data.request, state: data.state });
            setChatMessages([]);
        }
        
        if (data.type === 'final_decision') {
            setMetrics(data.metrics);
            setIsThinking(false);
        }
    });
    isSyncingRef.current = false;
  }, [loading, isThinking]);

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
      const newRun = { name: runName, metrics: { ...metrics } };
      setSavedRuns(prev => [...prev, newRun]);
      
      setFeed([]);
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

  const handleTabKeyDown = useCallback((e) => {
    const tabIds = TABS.map(t => t.id);
    const currentIdx = tabIds.indexOf(activeTab);
    let nextIdx = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (currentIdx + 1) % tabIds.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (currentIdx - 1 + tabIds.length) % tabIds.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = tabIds.length - 1;
    }
    if (nextIdx >= 0) {
      setActiveTab(tabIds[nextIdx]);
      document.getElementById(`tab-${tabIds[nextIdx]}`)?.focus();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-6 w-full flex flex-col gap-5 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-0 shrink-0">
        <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-white tracking-tight font-display">
                GPU Pricing Agent
            </h1>
            <div className="flex items-center gap-3 mt-1">
                <p className="text-slate-500 uppercase tracking-widest text-xs font-medium">Autonomous Deal Desk Simulation</p>
                {GROUP_ID !== 'default' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-600/15 text-primary-400 border border-primary-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" aria-hidden="true"></span>
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
                  className="ml-auto px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-red-400 hover:text-white border border-red-500/20 hover:bg-red-500/15 rounded-lg transition-colors"
                >
                  Reset Simulation
                </button>
            </div>
        </div>
      </header>

      <nav aria-label="Main navigation">
        <div
          role="tablist"
          aria-label="Simulation views"
          onKeyDown={handleTabKeyDown}
          className="flex bg-slate-800/60 p-1 rounded-lg w-full md:w-fit border border-slate-700/40"
        >
          {TABS.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </nav>

      <main id="main-content">
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'policy' && (
            <Suspense fallback={<LazyFallback />}>
              <PolicyControls />
            </Suspense>
          )}

          {activeTab === 'simulation' && (
            <div className="flex flex-col gap-5 animate-fade-in w-full">
                <div className="panel p-4 flex flex-wrap items-center gap-3">
                    <button 
                        onClick={runTickStream}
                        disabled={loading || isAutoRunning}
                        className="px-4 py-2.5 sm:px-6 sm:py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                        {loading && !isAutoRunning ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Simulating...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Manual Tick
                            </>
                        )}
                    </button>
                    <button 
                        onClick={() => setIsAutoRunning(!isAutoRunning)}
                        aria-pressed={isAutoRunning}
                        className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${isAutoRunning ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                    >
                        {isAutoRunning ? (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Stop Auto
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Auto Run
                            </>
                        )}
                    </button>
                    <div className="w-px h-8 bg-slate-700 mx-1 self-center hidden sm:block" aria-hidden="true"></div>
                    <button 
                        onClick={saveCurrentRun}
                        disabled={feed.length === 0 || isAutoRunning}
                        className="px-4 py-2.5 sm:px-4 sm:py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Save Run
                    </button>
                </div>

                <div className="flex flex-col xl:flex-row gap-5 w-full items-start">
                    <div className="flex-1 flex flex-col gap-5 w-full min-w-0">
                        <div className="w-full shrink-0 h-[400px]">
                            <ChatbotPlayground lastDealContext={lastDealContext} chatMessages={chatMessages} setChatMessages={setChatMessages} />
                        </div>
                        <div className="panel w-full flex-col flex flex-1 mt-0 min-h-[500px]">
                            <div className="px-6 py-4 border-b border-slate-700/60 bg-slate-900/80 flex justify-between items-center z-10 sticky top-0">
                                <h2 className="text-lg font-display font-bold text-white">Executive Live Deal Feed</h2>
                                <span className="text-slate-500 text-xs font-semibold uppercase tracking-widest bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/40">{feed.length} Decisions</span>
                            </div>
                            <div className="p-6 flex flex-col gap-6 min-h-[400px]">
                                {feed.map((tick, idx) => (
                                    <div key={tick._serverId || idx} className="flex flex-col gap-6 w-full">
                                        <LiveFeed data={tick} />
                                        {idx < feed.length - 1 && (
                                            <div className="flex items-center w-full px-4 sm:px-12 opacity-30 py-1" aria-hidden="true">
                                                <div className="flex-1 h-px bg-slate-600"></div>
                                                <div className="mx-4 w-1 h-1 rounded-full bg-slate-500"></div>
                                                <div className="flex-1 h-px bg-slate-600"></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <aside className="w-full xl:w-[420px] 2xl:w-[480px] shrink-0 h-[85vh] xl:sticky xl:top-6 z-30" aria-label="Agent workflow">
                        <AgentSidebar 
                            streamData={agentStreamData} 
                            isThinking={isThinking}
                            lastDealContext={lastDealContext}
                            onReplay={handleReplay}
                            onExecuteCounterOffer={handleExecuteCounterOffer}
                            onViewComparison={() => setComparisonOpen(true)}
                            hasComparison={!!comparisonData}
                        />
                    </aside>
                </div>
            </div>
          )}

          {activeTab === 'wargames' && (
            <Suspense fallback={<LazyFallback />}>
              <WarGamesPanel
                  savedRuns={savedRuns}
                  onClearRuns={() => setSavedRuns([])}
                  onSaveRun={saveCurrentRun}
                  canSave={feed.length > 0 && !isAutoRunning}
                  isAutoRunning={isAutoRunning}
                  onRunScenario={handleRunScenario}
              />
            </Suspense>
          )}
        </div>
      </main>

      {ADMIN_KEY && adminData && (
        <div className="fixed bottom-6 left-6 z-[9999] max-w-[320px] animate-slide-up">
          <div className="bg-slate-950 border border-amber-500/30 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-amber-500/5 border-b border-amber-500/20 px-5 py-3 flex items-center justify-between">
              <span className="text-amber-400 font-display font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true"></div>
                 Simulation Debugger
              </span>
              <span className="text-slate-500 text-[10px] font-mono">ID: {GROUP_ID}</span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                 <label className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-1 block">Scenario Name</label>
                 <p className="text-white font-display font-bold text-sm leading-tight">
                   {adminData.scenario_name || (adminData.mode === 'random' ? 'Random Walk' : 'Loading...')}
                 </p>
              </div>
              <div>
                 <label className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-1 block">Expected Behavior</label>
                 <p className="text-amber-200/70 text-xs font-mono leading-relaxed">
                   {adminData.expected_behavior || adminData.message || "Awaiting next tick..."}
                 </p>
              </div>
              <div className="flex justify-between items-center bg-black/30 px-3 py-2 rounded-lg border border-slate-700/40">
                 <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Tick Counter</span>
                 <span className="text-amber-400 font-mono font-bold text-xs">#{adminData.tick_counter}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 px-4 py-1.5 bg-black/40 rounded-full border border-slate-700/30 text-[9px] text-slate-500 font-mono flex items-center justify-center gap-2 italic">
             Confidential Instructor Console
          </div>
        </div>
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
