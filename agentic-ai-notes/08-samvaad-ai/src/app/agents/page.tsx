"use client";

import { ChatInterface } from "@/components/chat-interface";

export default function AgentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">AI Agent</h1>
      <p className="text-gray-400 mb-6">
        Watch the AI call tools like weather, calculator, and search to answer your questions.
      </p>
      <ChatInterface
        endpoint="/api/agents"
        placeholder="Try: What's the weather in Mumbai? or Calculate 15% tip on 2500"
      />
    </div>
  );
}
