import { useState, useRef, useEffect } from 'react';
import { useTripStore } from '../store/tripStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Send, User, Bot, Loader2, Paperclip, Mic } from 'lucide-react';
import { cn } from '../utils/cn';
import { Orchestrator } from '../agents/orchestrator';
import Markdown from 'react-markdown';

export function ChatScreen() {
  const { context, addMessage } = useTripStore();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [context.conversationHistory]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setIsTyping(true);

    try {
      const orchestrator = new Orchestrator(process.env.GEMINI_API_KEY!);
      const result = await orchestrator.processInput(context, { type: 'text', data: userMessage });
      
      if (result.conversationHistory) {
        const lastMessage = result.conversationHistory[result.conversationHistory.length - 1];
        addMessage(lastMessage);
      }
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({ role: 'assistant', content: 'something went wrong 😅 — try again?', agent: 'Companion' });
    } finally {
      setIsTyping(false);
    }
  };

  // Chat needs a fixed viewport height minus the bottom nav, so messages fill the space
  // and the input bar stays pinned at the bottom. We use dvh units for mobile safety.
  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 7rem)' }}>
      <header className="px-6 py-4 glass-nav border-b border-outline-variant/10 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot size={24} className="text-primary" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-headline font-bold text-on-surface">TravelMind AI</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>
        <button className="text-primary font-bold text-sm">Clear chat</button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-6 no-scrollbar">
        {context.conversationHistory.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={cn(
                'flex gap-3 max-w-[85%]',
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  isUser ? 'bg-secondary/10' : 'bg-primary/10'
                )}
              >
                {isUser ? <User size={16} className="text-secondary" /> : <Bot size={16} className="text-primary" />}
              </div>
              <div className="space-y-1">
                {!isUser && msg.agent && (
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest ml-1">
                    {msg.agent}
                  </span>
                )}
                <div
                  className={cn(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm',
                    isUser
                      ? 'bg-secondary text-on-secondary rounded-tr-none'
                      : 'bg-surface-container-lowest text-on-surface rounded-tl-none border border-outline-variant/10'
                  )}
                >
                  <div className="markdown-body">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
                <span className="text-[9px] text-on-surface-variant/40 font-medium block px-1">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-primary" />
            </div>
            <div className="bg-surface-container-lowest px-4 py-3 rounded-2xl rounded-tl-none border border-outline-variant/10 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-white/80 backdrop-blur-xl border-t border-outline-variant/10">
        <div className="relative flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <Paperclip size={20} />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="ask me anything about your trip..."
              className="w-full bg-surface-container rounded-2xl px-5 py-3.5 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none active:scale-90 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
          <button className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
            <Mic size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
