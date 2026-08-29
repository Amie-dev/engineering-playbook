# File 02: Realtime Streaming Chat API (`src/app/api/chat/route.ts`)

## Overview
The **Realtime Streaming Chat API** handles HTTP POST requests, invoking Vercel AI SDK's **`streamText()`** to stream response chunks back to the client over Server-Sent Events (SSE).

---

## 1. Response Streaming Lifecycle

```mermaid
sequenceDiagram
    participant Client as React Client (useChat)
    participant Route as Next.js API Route (POST /api/chat)
    participant AI as Vercel AI SDK (streamText)
    participant Model as LLM Provider

    Client->>Route: POST /api/chat { messages: [...] }
    Route->>AI: Invoke streamText({ model, messages, tools })
    AI->>Model: Request Completion Stream
    Model-->>AI: Yield Chunks
    AI-->>Route: Convert to Data Stream Response
    Route-->>Client: Stream Response Chunks (SSE)
```

---

## 2. Streaming Route Implementation (`src/app/api/chat/route.ts`)

```typescript
import { streamText } from "ai";
import { defaultModel } from "@/lib/ai-config";
import { tools } from "@/lib/tools";

export async function POST(req: Request) {
    const { messages } = await req.json();

    // 1. Invoke Realtime Streaming
    const result = streamText({
        model: defaultModel,
        system: "You are Samvaad AI, a helpful, polite conversational assistant. Answer user queries accurately and use tools when appropriate.",
        messages,
        tools,
        maxSteps: 5 // Enable automatic multi-step tool execution loops!
    });

    // 2. Return UI Data Stream Response
    return result.toDataStreamResponse();
}
```

---

## Key Takeaways
1. **`streamText`** returns token chunks immediately, providing responsive UI interaction.
2. Setting **`maxSteps: 5`** allows `streamText` to automatically execute client/server tool calls in multi-step loops.
