# 04 - Agent chat

Every Genesis app includes a visible agent interface. Default: drop in the
prebuilt block. Custom UIs: use the SDK v2 pattern. Full SDK reference:
`src/lib/agent-chat/v2/README.md`.

## Default: FloatingAgentChat

```tsx
import { FloatingAgentChat } from '@/components/blocks';

<FloatingAgentChat agentId={AGENT_ID} publicAgentId={PUBLIC_AGENT_ID} title="Assistant" />
```

Handles the launcher, mobile-responsive panel, SDK wiring, error/retry state,
and a hosted-iframe fallback. Renders nothing when both ids are absent.

## The two ids (do not swap them)

| Prop | What it is | Drives |
|---|---|---|
| `agentId` | SpaceAgent id from the `manage_agent` CreateAgent result ("The new agent id is ...") | the in-app SDK |
| `publicAgentId` | trailing segment of the public `/a/{publicAgentId}` URL | the hosted iframe fallback |

Passing the `/a/...` id as `agentId` 404s against the SDK. The agent must have
PUBLIC visibility or conversation creation fails ("Public agent not found").

## Custom UI: SDK v2 two-component split

`useChat` crashes if passed `undefined` - create the chat first, render the
hook user only after:

```tsx
import { useChat } from '@ai-sdk/react';
import { createConversation, createAgentChat } from '@/lib/agent-chat/v2';
import { ulid } from 'ulidx';

function ChatLauncher() {
  const [chat, setChat] = useState<ReturnType<typeof createAgentChat> | null>(null);
  const start = async () => {
    const { conversationId } = await createConversation(AGENT_ID);
    setChat(createAgentChat(AGENT_ID, conversationId));
  };
  if (!chat) return <Button onClick={start}>Start chat</Button>;
  return <ActiveChat chat={chat} />;
}

function ActiveChat({ chat }: { chat: ReturnType<typeof createAgentChat> }) {
  const { messages, status, stop, addToolApprovalResponse } = useChat({ chat, id: chat.id });
  const send = (text: string) =>
    chat.sendMessage({ id: ulid(), role: 'user', parts: [{ type: 'text', text }] });
  // render with AIAssistantPanel or ai-elements primitives
}
```

Pair with `<AIAssistantPanel />` from `@/components/blocks` (pass `messages`,
`onSend`, `busy`, `status`, `onStop`, `onApprove`) or compose
`@/components/ai-elements/*` directly.

## Rules that prevent the classic bugs

- Render ALL message part types. Filter text parts AND handle
  `isToolUIPart(part)` - otherwise tool calls are silently dropped.
- Tool approval: call `addToolApprovalResponse({ id, approved })` with
  `part.approval.id`, NOT `toolCallId`. The wrong id updates nothing. The
  conversation auto-resumes after the response.
- Message ids: generate with `ulid()`.
- Busy state: `status === 'submitted' || status === 'streaming'`.
- Custom panels must be responsive: full-bleed on phones, fixed corner panel
  from `sm:` up (never a bare `w-[400px] h-[600px]`).
