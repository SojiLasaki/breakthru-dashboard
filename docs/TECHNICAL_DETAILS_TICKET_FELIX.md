# Technical Details: Ask Fix-it Felix Feature

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌───────────────────┐    ┌─────────────────┐  │
│  │ TicketDetailPage │───▶│ TicketFelixChat   │───▶│ useFelixChat    │  │
│  │   (Host Page)    │    │   (Chat Panel)    │    │    (Hook)       │  │
│  └──────────────────┘    └───────────────────┘    └─────────────────┘  │
│           │                       │                        │            │
│           │                       ▼                        ▼            │
│           │              ┌───────────────────┐    ┌─────────────────┐  │
│           │              │   localStorage    │    │ felixChatService│  │
│           │              │  (Thread Memory)  │    │   (API Client)  │  │
│           │              └───────────────────┘    └─────────────────┘  │
│           │                                                │            │
└───────────┼────────────────────────────────────────────────┼────────────┘
            │                                                │
            │                    HTTP/REST                   │
            ▼                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Django + DRF)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌───────────────────┐    ┌─────────────────┐  │
│  │  /api/ai/chat/   │───▶│ LangGraph Agent   │───▶│  LLM Provider   │  │
│  │   (Endpoint)     │    │  (Orchestrator)   │    │ (OpenRouter/    │  │
│  └──────────────────┘    └───────────────────┘    │  OpenAI/Ollama) │  │
│                                  │                └─────────────────┘  │
│                                  ▼                                      │
│                         ┌───────────────────┐                           │
│                         │   MCP Adapters    │                           │
│                         │ (Supply Chain,    │                           │
│                         │  Ticketing, etc.) │                           │
│                         └───────────────────┘                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. TicketFelixChat.tsx (Frontend Component)
**Location:** `src/components/TicketFelixChat.tsx`

| Feature | Implementation |
|---------|----------------|
| **Slide-out Panel** | Fixed position, 420px width, right-aligned |
| **Thread Memory** | localStorage with key `felix_ticket_thread_{ticketId}_{userId}` |
| **Context Injection** | Builds context block with ticket, diagnostic, checklist data |
| **Streaming** | Uses `useFelixChat` hook with `onDelta` callback |
| **Proposals** | Supports action proposals for checklist updates |

### 2. Thread Memory Storage
```typescript
// Storage key pattern
const THREAD_KEY = (ticketId: string, userId: string | number) =>
  `felix_ticket_thread_${ticketId}_${userId}`;

// Thread structure
interface TicketThread {
  ticketId: string;
  messages: ThreadMessage[];
  createdAt: string;
  updatedAt: string;
}
```

### 3. Context Block Structure
```typescript
// Auto-injected with every message
const contextBlock = `
[Ticket Context]
Ticket ID: ${ticket.ticket_id}
Title: ${ticket.title}
Status: ${ticket.status}
Specialization: ${ticket.specialization}
Priority: ${ticket.priority}, Severity: ${ticket.severity}
Issue: ${ticket.issue_description}

[Diagnostic Report]
Fault Code: ${diagnostic.fault_code}
Probable Cause: ${diagnostic.probable_cause}
Recommended Actions: ${diagnostic.recommended_actions}

[Repair Checklist - ${steps.length} steps]
1. ✓ Step 1 title (Note: user note)
2. ○ Step 2 title [FLAGGED]
...
Progress: 3/10 completed
`;
```

---

## Potential Q&A Questions

### Architecture & Design

**Q: Why use localStorage for thread memory instead of backend storage?**
> A: localStorage provides instant persistence without API calls, works offline, and keeps conversation data private to the user's browser. For enterprise deployments, we can easily migrate to backend storage by swapping the storage functions.

**Q: How does the context injection work?**
> A: Every message sent to the AI includes a `contextBlock` that contains the current ticket state, diagnostic information, and checklist progress. This is appended to the last user message before sending to the API.

**Q: Why a slide-out panel instead of a modal?**
> A: The slide-out panel allows technicians to reference the ticket details while chatting. They can see the checklist, diagnostic report, and map while asking questions.

### Performance & Scalability

**Q: What's the message limit for thread memory?**
> A: Currently unlimited, but we persist to localStorage which has ~5MB limit per domain. For long conversations, we could implement message trimming (keep last N messages) or summarization.

**Q: How does streaming work?**
> A: We use Server-Sent Events (SSE) via the `streamFelixChat` function. The `onDelta` callback updates the UI in real-time as tokens arrive from the LLM.

**Q: What happens if the AI backend is slow or unavailable?**
> A: The UI shows a "Thinking..." indicator with a spinner. If the request fails, an error message is displayed in the chat. The user's message is preserved so they can retry.

### Security & Privacy

**Q: Is conversation data sent to the server?**
> A: Messages are sent to the backend for AI processing but are not stored server-side (unless action proposals are approved). Thread history is stored only in the user's browser localStorage.

**Q: How is the ticket context protected?**
> A: The API requires JWT authentication. Users can only access tickets they have permission to view. The context block is built from data the user already has access to.

### Integration & Extensibility

**Q: Can Felix update the checklist directly?**
> A: Felix can propose checklist updates via the action proposal system. Users see a proposal card and click "Apply" to confirm changes. This maintains human-in-the-loop control.

**Q: How would we add new capabilities (e.g., order parts)?**
> A: Add new proposal types to the backend LangGraph agent. The frontend already supports rendering proposal cards and handling approval callbacks.

**Q: Can this be used for other entity types (orders, schedules)?**
> A: Yes! The `TicketFelixChat` component pattern can be adapted for any entity. Just change the context block builder and update the props.

---

## Data Flow

### 1. User Opens Chat
```
User clicks sparkle button
  → TicketFelixChat mounts
  → loadThread(ticketId, userId) from localStorage
  → Render previous messages (if any)
```

### 2. User Sends Message
```
User types and presses Enter
  → Add user message to state
  → Build contextBlock from ticket/diagnostic/checklist
  → Call streamFelixChat() with messages + contextBlock
  → Stream response via onDelta callback
  → Save updated thread to localStorage
```

### 3. Thread Persistence
```
On every message change:
  → saveThread() to localStorage
  → Key: felix_ticket_thread_{ticketId}_{userId}
  → Value: JSON {ticketId, messages[], createdAt, updatedAt}
```

---

## Testing Coverage

| Test | Description |
|------|-------------|
| Display floating button | Verify sparkle button visible on summary view |
| Open chat panel | Click button, verify panel opens with context |
| Show suggestion chips | Verify quick-start prompts displayed |
| Fill input from chip | Click chip, verify textarea populated |
| Send message | Type and send, verify user message appears |
| Receive AI response | Verify loading state and response display |
| Close panel | Click X, verify panel closes |
| Thread memory | Navigate away and back, verify messages persist |
| Clear thread | Click trash, verify messages cleared |
| Message count | Verify "N messages in thread" indicator |
| Full detail view button | Verify header button in checklist view |
| Context badges | Verify ticket ID and fault code shown |

**Total: 13 E2E tests, all passing**

---

## File Structure

```
breakthru-dashboard/
├── src/
│   ├── components/
│   │   └── TicketFelixChat.tsx    # Main chat panel component (517 lines)
│   ├── pages/
│   │   └── TicketDetailPage.tsx   # Host page (modified +70 lines)
│   ├── hooks/
│   │   └── useFelixChat.ts        # Chat streaming hook (existing)
│   └── services/
│       └── felixChatService.ts    # API client (existing)
├── e2e/
│   └── ticket-felix-chat.spec.ts  # Playwright tests (314 lines)
└── docs/
    ├── DEMO_PROMPTS_TICKET_FELIX.md
    └── TECHNICAL_DETAILS_TICKET_FELIX.md
```

---

## Future Enhancements

1. **Voice Input** - Add microphone button for hands-free operation
2. **Image Attachments** - Allow technicians to share photos in chat
3. **Checklist Auto-Update** - Felix proposes step completion based on conversation
4. **Knowledge Search** - Integrate with manual/documentation search
5. **Multi-Language** - Support for non-English technicians
6. **Offline Mode** - Queue messages when disconnected, sync when online
