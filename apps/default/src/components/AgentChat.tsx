import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { createConversation, createAgentChat } from '@/lib/agent-chat/v2';
import { isToolUIPart } from 'ai';
import type { UIMessage } from 'ai';
import { ulid } from 'ulidx';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Sparkles, Send, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const AGENT_ID = '01KR3C3290V7YDD8FSR43FBP1C';

function ActiveChat({ chat }: { chat: ReturnType<typeof createAgentChat> }) {
  const { messages, status, addToolApprovalResponse } = useChat({ chat, id: chat.id });
  const [input, setInput] = React.useState('');
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const isBusy = status === 'submitted' || status === 'streaming';

  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput('');
    await chat.sendMessage({ id: ulid(), role: 'user', parts: [{ type: 'text', text }] });
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Excel AI Assistant</p>
            <p className="text-xs text-muted-foreground">Ask me anything about your spreadsheet — formulas, structure, data types, or revisions.</p>
            <div className="mt-4 space-y-2 w-full">
              {['What formulas should I add?', 'How do I structure this better?', 'Explain what each sheet does'].map(s => (
                <button key={s} onClick={() => { setInput(s); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted text-foreground rounded-bl-sm')}>
              {msg.parts.map((part, i) => {
                const key = `${msg.id}-${i}`;
                if (part.type === 'text') return <span key={key} className="whitespace-pre-wrap">{part.text}</span>;
                if (isToolUIPart(part)) {
                  return (
                    <div key={key} className="text-xs opacity-70 italic">
                      {part.state === 'approval-requested' && part.approval != null ? (
                        <div>
                          <p className="mb-1">Tool: {part.toolName}</p>
                          <div className="flex gap-1">
                            <button onClick={() => addToolApprovalResponse({ id: part.approval!.id, approved: true })}
                              className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs">Approve</button>
                            <button onClick={() => addToolApprovalResponse({ id: part.approval!.id, approved: false })}
                              className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">Deny</button>
                          </div>
                        </div>
                      ) : <span>Tool: {part.toolName} [{part.state}]</span>}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {isBusy && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={isBusy}
            placeholder="Ask the AI assistant..."
            className="flex-1 px-3 py-2 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-60"
          />
          <button onClick={send} disabled={!input.trim() || isBusy}
            className={cn('p-2 rounded-xl transition-all',
              input.trim() && !isBusy ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export const AgentChatButton: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [chat, setChat] = React.useState<ReturnType<typeof createAgentChat> | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const openChat = async () => {
    setIsOpen(true);
    if (chat) return;
    setIsLoading(true);
    try {
      const { conversationId } = await createConversation(AGENT_ID);
      setChat(createAgentChat(AGENT_ID, conversationId));
    } catch {
      setError('Unable to connect to AI assistant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={isOpen ? () => setIsOpen(false) : openChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center transition-all hover:bg-primary/90"
      >
        <AnimatePresence mode="wait">
          {isOpen
            ? <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-5 h-5" /></motion.div>
            : <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageSquare className="w-5 h-5" /></motion.div>
          }
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-40 w-80 h-[460px] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Excel AI Assistant</p>
                <p className="text-xs text-muted-foreground">Ask me anything about your data</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="ml-auto p-1 rounded-md hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Connecting to AI...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <button onClick={() => { setError(null); setIsLoading(false); openChat(); }}
                    className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Retry</button>
                </div>
              ) : chat ? (
                <ActiveChat chat={chat} />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
