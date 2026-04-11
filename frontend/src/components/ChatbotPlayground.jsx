import React, { useState, useEffect, useRef, memo } from 'react';

const ChatbotPlayground = memo(({ lastDealContext, chatMessages, setChatMessages }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatContainerRef = useRef(null);
    const GROUP_ID = new URLSearchParams(window.location.search).get('group') || 'default';

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        
        const newMessages = [...chatMessages, { role: 'user', content: userMsg }];
        setChatMessages(newMessages);
        setLoading(true);

        try {
            const res = await fetch(`/api/chat?group_id=${GROUP_ID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    query: userMsg,
                    history: chatMessages,
                    current_request: lastDealContext?.request || null,
                    current_state: lastDealContext?.state || null
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                
                let botMsgContent = data.response;
                
                if (!botMsgContent) {
                    botMsgContent = `**Decision:** ${data.decision.action} at $${data.decision.final_price_per_hour.toFixed(2)}/hr\n\n`;
                    botMsgContent += `**Reasoning:**\n${data.decision.explanation}\n\n`;
                    
                    const overrides = data.extracted_params;
                    const polOverrides = Object.entries(overrides.policy_overrides).filter(([k,v]) => v !== null);
                    const reqOverrides = Object.entries(overrides.request_overrides).filter(([k,v]) => v !== null);
                    
                    if (polOverrides.length > 0 || reqOverrides.length > 0) {
                        botMsgContent += `_Extracted Parameters Used:_\n`;
                        [...polOverrides, ...reqOverrides].forEach(([k, v]) => {
                            botMsgContent += `- ${k}: ${v}\n`;
                        });
                    }
                }

                setChatMessages(prev => [...prev, { role: 'assistant', content: botMsgContent }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to the simulator." }]);
            }
        } catch (err) {
            console.error(err);
            setChatMessages(prev => [...prev, { role: 'assistant', content: "Failed to reach the chatbot server." }]);
        } finally {
            setLoading(false);
        }
    };

    const renderMarkdownText = (text) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            if (line.startsWith('### ')) {
                return <h4 key={i} className="text-white font-bold text-sm mt-4 mb-2 uppercase tracking-wider border-b border-slate-700/40 pb-1">{renderInline(line.substring(4))}</h4>;
            }
            if (line.startsWith('## ')) {
                return <h3 key={i} className="text-white font-bold text-base mt-5 mb-2 border-b border-primary-500/20 pb-1">{renderInline(line.substring(3))}</h3>;
            }

            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const content = line.trim().substring(2);
                return (
                    <li key={i} className="ml-4 list-disc marker:text-primary-500 my-1">
                        {renderInline(content)}
                    </li>
                );
            }

            if (line.trim() === '') return <div key={i} className="h-2" />;
            
            return (
                <p key={i} className="mt-1.5 first:mt-0 text-slate-300">
                    {renderInline(line)}
                </p>
            );
        });
    };

    const renderInline = (content) => {
        const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_)/g);
        return parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="text-white font-extrabold">{part.slice(2, -2)}</strong>;
            }
            if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
                return <em key={j} className="text-primary-300 not-italic font-semibold">{part.slice(1, -1)}</em>;
            }
            return <span key={j}>{part}</span>;
        });
    };

    return (
        <div className="panel p-4 h-full flex flex-col relative overflow-hidden border-primary-500/15 min-h-[380px]">
            <div className="flex items-center gap-3 mb-4 relative z-10 border-b border-slate-700/40 pb-3">
                <div className="bg-primary-500/10 p-2 rounded-lg border border-primary-500/20">
                    <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-display font-bold text-white leading-tight">Simulator Assistant</h3>
                    <p className="text-xs text-slate-500">Ask "What-if" questions based on the current context</p>
                </div>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent" role="log" aria-live="polite" aria-label="Chat messages">
                {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                        <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-sm">
                            Ask me to modify the current scenario's policies or parameters.<br/>
                            <span className="italic text-slate-600">e.g., "What if min margin is 25% and request is Spot?"</span>
                        </p>
                    </div>
                ) : (
                    chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[95%] rounded-lg p-3 text-[13px] leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-primary-600/70 text-white rounded-br-sm border border-primary-500/30' 
                                : 'bg-slate-800/60 text-slate-300 rounded-bl-sm border border-slate-700/40 overflow-hidden'
                            }`}>
                                {msg.role === 'user' ? (
                                    <p>{msg.content}</p>
                                ) : (
                                    <div className="break-words">
                                        {renderMarkdownText(msg.content)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800/60 rounded-lg rounded-bl-sm p-4 border border-slate-700/40 flex items-center gap-2" role="status" aria-label="Loading response">
                            <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                            <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSend} className="relative mt-auto border-t border-slate-700/40 pt-3">
                <label htmlFor="chat-input" className="sr-only">Ask a what-if question</label>
                <input 
                    id="chat-input"
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="E.g., What if the hardware was an A100?"
                    disabled={loading}
                    className="w-full bg-slate-800/50 text-white text-sm rounded-lg pl-3 pr-10 py-2.5 border border-slate-600 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors placeholder-slate-600 disabled:opacity-50"
                />
                <button 
                    type="submit"
                    disabled={!input.trim() || loading}
                    aria-label="Send message"
                    className="absolute right-1.5 top-[16px] p-1.5 text-primary-400 hover:text-white hover:bg-primary-500/15 rounded-md transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    );
});
ChatbotPlayground.displayName = 'ChatbotPlayground';

export default ChatbotPlayground;
