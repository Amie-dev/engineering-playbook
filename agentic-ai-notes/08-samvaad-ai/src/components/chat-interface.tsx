"use client";

import { useChat } from "ai/react";
import { MessageBubble } from "./message-bubble";
import { ToolCallCard } from "./tool-call-card";
import { useState } from "react";

interface Props {
  endpoint: string;
  placeholder?: string;
  showModelPicker?: boolean;
}

export function ChatInterface({
  endpoint,
  placeholder = "Type a message...",
  showModelPicker = false,
}: Props) {
  const [model, setModel] = useState("openai");

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: endpoint,
      body: { model },
    });

  return (
    <div className="flex flex-col h-[70vh]">
      {showModelPicker && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setModel("openai")}
            className={`px-3 py-1 rounded text-sm ${
              model === "openai"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            OpenAI
          </button>
          <button
            onClick={() => setModel("gemini")}
            className={`px-3 py-1 rounded text-sm ${
              model === "gemini"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            Gemini
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {messages.map((m) => (
          <div key={m.id}>
            {m.toolInvocations?.map((tool, i) => (
              <ToolCallCard
                key={i}
                name={tool.toolName}
                args={tool.args}
                result={"result" in tool ? tool.result : undefined}
              />
            ))}
            {m.content && (
              <MessageBubble role={m.role as "user" | "assistant"} content={m.content} />
            )}
          </div>
        ))}
        {isLoading && (
          <div className="text-gray-500 text-sm animate-pulse">Thinking...</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}
