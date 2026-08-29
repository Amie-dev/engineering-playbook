export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  sources?: Source[];
  cost?: CostInfo;
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
}

export interface Source {
  title: string;
  content: string;
  score: number;
}

export interface CostInfo {
  inputTokens: number;
  outputTokens: number;
  model: string;
  cost: number;
}

export interface ChatSession {
  _id?: string;
  mode: "chat" | "rag" | "agent";
  messages: Message[];
  createdAt: Date;
}

export interface DocumentChunk {
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    chunkIndex: number;
  };
}
