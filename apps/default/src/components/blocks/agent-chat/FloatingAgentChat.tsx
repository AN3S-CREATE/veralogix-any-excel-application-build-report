'use client';

import { useChat } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ulid } from 'ulidx';

import { AIAssistantPanel } from '@/components/blocks/ai-assistant/AIAssistantPanel';
import { Button } from '@/components/ui/button';
import { createAgentChat, createConversation } from '@/lib/agent-chat/v2';
import { cn } from '@/lib/utils';

/** Literal accent classes so the Tailwind JIT scan (.tsx only) emits them. */
const ACCENT_BG = {
  1: 'bg-chart-1',
  2: 'bg-chart-2',
  3: 'bg-chart-3',
  4: 'bg-chart-4',
  5: 'bg-chart-5',
} as const;

type AgentChat = ReturnType<typeof createAgentChat>;

export interface FloatingAgentChatProps {
  /**
   * SpaceAgent id from the manage_agent CreateAgent result (the value after
   * "The new agent id is"). Drives the in-app SDK. NOT the id from the /a/...
   * public URL - that one 404s against the SDK.
   */
  agentId?: string;
  /**
   * Trailing segment of the /a/{publicAgentId} public URL. Drives the hosted
   * iframe fallback (and the "Open hosted chat" escape hatch on SDK errors).
   */
  publicAgentId?: string;
  /** Header + launcher label. */
  title?: string;
  /** Chart-token index for the launcher color; defaults to bg-primary. */
  accent?: 1 | 2 | 3 | 4 | 5;
  /** Starter prompt chips forwarded to AIAssistantPanel. */
  suggestions?: readonly string[];
  placeholder?: string;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * FloatingAgentChat - the complete floating agent chat: launcher button,
 * mobile-responsive panel, Agent Chat SDK v2 wiring (lazy conversation
 * creation, two-component useChat split), a friendly error/retry state, and
 * a hosted-chat iframe fallback when only a publicAgentId is available.
 *
 * Sanctioned exception to the blocks "no network" rule: it delegates ALL
 * network to @/lib/agent-chat/v2 and never hand-rolls a fetch.
 */
export function FloatingAgentChat({
  agentId,
  publicAgentId,
  title = 'Assistant',
  accent,
  suggestions,
  placeholder,
  defaultOpen = false,
  className,
}: FloatingAgentChatProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [chat, setChat] = useState<AgentChat | null>(null);
  const [chatError, setChatError] = useState(false);
  const [starting, setStarting] = useState(false);

  const sdkMode = agentId != null && agentId !== '';
  const hostedUrl =
    publicAgentId != null && publicAgentId !== ''
      ? `https://www.taskade.com/a/${encodeURIComponent(publicAgentId)}`
      : null;

  const startChat = useCallback(async () => {
    if (!sdkMode || chat != null || starting) {
      return;
    }
    setStarting(true);
    try {
      const { conversationId } = await createConversation(agentId);
      setChat(createAgentChat(agentId, conversationId));
      setChatError(false);
    } catch {
      // Never let a 404/503 white-screen the app - keep the panel rendered
      // with a visible retry state (and a hosted-chat escape hatch).
      setChatError(true);
    } finally {
      setStarting(false);
    }
  }, [sdkMode, chat, starting, agentId]);

  // defaultOpen renders the panel without a launcher click, so handleOpen never
  // fires and the panel would sit on "Connecting..." forever. Start the
  // conversation from here too. startChat's own guards prevent double-starts;
  // skipping on chatError keeps failures on the manual "Try again" button
  // instead of an auto-retry loop.
  useEffect(() => {
    if (open && sdkMode && chat == null && !chatError && !starting) {
      void startChat();
    }
  }, [open, sdkMode, chat, chatError, starting, startChat]);

  // Nothing to chat with: render nothing rather than a dead launcher.
  if (!sdkMode && hostedUrl == null) {
    return null;
  }

  const handleOpen = () => {
    setOpen(true);
    void startChat();
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            {/* Tap-to-dismiss backdrop, mobile only. */}
            <div
              className="bg-foreground/20 fixed inset-0 z-40 sm:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className={cn(
                'fixed inset-0 z-50 h-full w-full sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[400px]',
                className,
              )}
            >
              <div className="bg-card text-card-foreground flex h-full flex-col overflow-hidden border shadow-lg sm:rounded-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="text-foreground text-sm font-semibold">{title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    aria-label="Close chat"
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>

                {sdkMode && chat != null ? (
                  <ActiveChat
                    chat={chat}
                    title={title}
                    suggestions={suggestions}
                    placeholder={placeholder}
                  />
                ) : sdkMode && chatError ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                    <p className="text-muted-foreground text-sm">
                      The assistant is warming up - try again.
                    </p>
                    <Button onClick={() => void startChat()} disabled={starting}>
                      Try again
                    </Button>
                    {hostedUrl != null ? (
                      <a
                        href={hostedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground text-xs underline"
                      >
                        Open hosted chat
                      </a>
                    ) : null}
                  </div>
                ) : sdkMode ? (
                  <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
                    Connecting...
                  </div>
                ) : hostedUrl != null ? (
                  <iframe
                    src={hostedUrl}
                    title={title}
                    allow="clipboard-read; clipboard-write"
                    className="h-full w-full flex-1 border-0"
                  />
                ) : null}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      {!open ? (
        <Button
          onClick={handleOpen}
          aria-label={`Open ${title}`}
          className={cn(
            'fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg',
            accent != null ? ACCENT_BG[accent] : 'bg-primary text-primary-foreground',
          )}
        >
          <MessageCircle className="size-6" aria-hidden />
        </Button>
      ) : null}
    </>
  );
}

/**
 * Inner component so useChat only ever mounts with a REAL Chat instance
 * (useChat crashes if passed undefined - the mandatory two-component split).
 */
function ActiveChat({
  chat,
  title,
  suggestions,
  placeholder,
}: {
  chat: AgentChat;
  title: string;
  suggestions?: readonly string[];
  placeholder?: string;
}) {
  const { messages, status, stop, addToolApprovalResponse } = useChat({ chat, id: chat.id });
  const busy = status === 'submitted' || status === 'streaming';

  const handleSend = async (text: string) => {
    await chat.sendMessage({
      id: ulid(),
      role: 'user',
      parts: [{ type: 'text', text }],
    });
  };

  return (
    <AIAssistantPanel
      messages={messages}
      onSend={handleSend}
      busy={busy}
      status={status}
      onStop={stop}
      onApprove={(id, approved) => addToolApprovalResponse({ id, approved })}
      title={title}
      suggestions={suggestions}
      placeholder={placeholder}
      className="rounded-none border-0"
    />
  );
}
