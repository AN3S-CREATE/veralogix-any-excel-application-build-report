'use client';

import {
  getToolName,
  isToolUIPart,
  type ChatStatus,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from 'ai';
import { Sparkles } from 'lucide-react';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * ICP-grounded default starter prompts (service-pro / ops dashboard - David
 * Acevedo's "run today" assistant). Outcome-named, non-technical actions the
 * operator actually performs: summarize jobs, surface follow-ups, draft replies.
 * Override via the `suggestions` prop for other verticals (sales / lead-gen /
 * helpdesk triage).
 */
export const DEFAULT_ASSISTANT_SUGGESTIONS: readonly string[] = [
  "Summarize today's jobs",
  'Which jobs are overdue or need scheduling?',
  'Draft a follow-up message to this customer',
  'Show me unpaid invoices',
] as const;

export interface AIAssistantPanelProps {
  /** Messages to render. Sourced from the host's `useChat({ chat }).messages`. */
  messages: UIMessage[];
  /** Host wires `chat.sendMessage(...)`. The panel never sends on its own. */
  onSend: (text: string) => void | Promise<void>;
  /** Host passes `status === 'submitted' || status === 'streaming'`. */
  busy?: boolean;
  /** Optional AI SDK chat status, forwarded to the submit button for spinner/stop. */
  status?: ChatStatus;
  /** Optional host stop handler (`useChat({ chat }).stop`). */
  onStop?: () => void;
  /**
   * Optional tool-approval handler. Host wires
   * `useChat({ chat }).addToolApprovalResponse` as
   * `(id, approved) => addToolApprovalResponse({ id, approved })` where `id` is
   * `part.approval.id` (NOT `toolCallId`). When provided, approval-requested
   * tool parts render inline Approve / Deny buttons.
   */
  onApprove?: (id: string, approved: boolean) => void;
  /** Starter prompt chips. Defaults to the service-pro ICP actions. */
  suggestions?: readonly string[];
  /** Header label. */
  title?: string;
  /** PromptInput textarea placeholder. */
  placeholder?: string;
  /** Empty-state heading. */
  emptyTitle?: string;
  /** Empty-state body copy. */
  emptyDescription?: string;
  className?: string;
}

/** Concatenate the text parts of a UIMessage into a single string. */
function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

/**
 * True when a message carries any tool part. Text-only messages render through
 * the fast `MessageResponse` path; messages with tool calls iterate parts so
 * tool calls (and their approval prompts) are never silently dropped.
 */
function hasToolPart(message: UIMessage): boolean {
  return message.parts.some((part) => isToolUIPart(part));
}

/**
 * Plain-language status for each tool part state. End users of generated apps
 * are non-technical - they must never see raw AI SDK state enums.
 */
const TOOL_STATE_LABELS: Record<ToolUIPart['state'], string> = {
  'input-streaming': 'Working on it...',
  'input-available': 'Working on it...',
  'approval-requested': 'Needs your approval',
  'approval-responded': 'Working on it...',
  'output-available': 'Done',
  'output-error': 'Something went wrong',
  'output-denied': 'Skipped',
};

/** Cleaned tool title: "manage_project" -> "Manage Project", never a raw identifier. */
function toolDisplayTitle(part: ToolUIPart | DynamicToolUIPart): string {
  return getToolName(part)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * AIAssistantPanel - a thin presentational wrapper over the ai-elements
 * Conversation + Message + PromptInput primitives. It renders the `messages`
 * prop, emits typed text via `onSend`, and reflects `busy`/`status`. It owns NO
 * message state and performs NO network calls - the live `useChat` wiring lives
 * in the host (per the agent-chat/v2 two-component split).
 */
export function AIAssistantPanel({
  messages,
  onSend,
  busy = false,
  status,
  onStop,
  onApprove,
  suggestions = DEFAULT_ASSISTANT_SUGGESTIONS,
  title = 'Assistant',
  placeholder = 'Ask me anything about your jobs, customers, or invoices…',
  emptyTitle = 'How can I help?',
  emptyDescription = 'Ask about your jobs, customers, or invoices - or pick a starter below.',
  className,
}: AIAssistantPanelProps) {
  const isEmpty = messages.length === 0;
  const effectiveStatus: ChatStatus | undefined = status ?? (busy ? 'submitted' : undefined);

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || busy) {
      return;
    }
    return onSend(text);
  };

  return (
    <Card
      className={cn(
        'bg-card text-card-foreground flex h-full min-h-0 flex-col overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="text-muted-foreground size-4" aria-hidden />
        <span className="text-foreground text-sm font-semibold">{title}</span>
      </div>

      <Conversation>
        <ConversationContent>
          {isEmpty ? (
            <ConversationEmptyState
              title={emptyTitle}
              description={emptyDescription}
              icon={<Sparkles className="size-6" aria-hidden />}
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {hasToolPart(message) ? (
                    message.parts.map((part, i) => {
                      if (part.type === 'text') {
                        return <MessageResponse key={i}>{part.text}</MessageResponse>;
                      }
                      if (isToolUIPart(part)) {
                        return (
                          <div
                            key={i}
                            className="text-muted-foreground my-1 flex flex-wrap items-center gap-2 text-xs"
                          >
                            <span className="italic">
                              {toolDisplayTitle(part)} · {TOOL_STATE_LABELS[part.state]}
                            </span>
                            {part.state === 'approval-requested' &&
                            part.approval != null &&
                            onApprove != null ? (
                              // Sized to match the ai-elements ConfirmationAction
                              // buttons (h-8 / sm) so approvals read consistently.
                              <span className="flex gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => onApprove(part.approval.id, true)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onApprove(part.approval.id, false)}
                                >
                                  Deny
                                </Button>
                              </span>
                            ) : null}
                          </div>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <MessageResponse>{messageText(message)}</MessageResponse>
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {suggestions.length > 0 ? (
        <div className="px-4 pb-2">
          <Suggestions>
            {suggestions.map((suggestion) => (
              <Suggestion
                key={suggestion}
                suggestion={suggestion}
                onClick={onSend}
                disabled={busy}
              />
            ))}
          </Suggestions>
        </div>
      ) : null}

      <div className="p-4 pt-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder={placeholder} disabled={busy} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={effectiveStatus} onStop={onStop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </Card>
  );
}
