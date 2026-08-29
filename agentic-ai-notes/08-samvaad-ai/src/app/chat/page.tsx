"use client";

import { ChatInterface } from "@/components/chat-interface";

export default function ChatPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Chat</h1>
      <p className="text-gray-400 mb-6">
        Stream AI responses in real-time. Switch between OpenAI and Gemini.
      </p>
      <ChatInterface
        endpoint="/api/chat"
        placeholder="Ask me anything..."
        showModelPicker={true}
      />
    </div>
  );
}
