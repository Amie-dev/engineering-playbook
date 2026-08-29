"use client";

import { useState } from "react";
import { SourceCitation } from "@/components/source-citation";

export default function SearchPage() {
  const [document, setDocument] = useState("");
  const [source, setSource] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<
    Array<{ title: string; content: string; score: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [ingested, setIngested] = useState(false);

  async function handleIngest() {
    setLoading(true);
    const res = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ingest", text: document, source }),
    });
    const data = await res.json();
    setIngested(true);
    setLoading(false);
    alert(`Ingested ${data.chunksStored} chunks from "${source}"`);
  }

  async function handleQuery() {
    setLoading(true);
    const res = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "query", question }),
    });
    const data = await res.json();
    setAnswer(data.answer);
    setSources(data.sources || []);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">RAG Document Search</h1>
      <p className="text-gray-400 mb-6">
        Upload documents, then ask questions with source citations.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Upload Document</h2>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source name (e.g., company-policy.pdf)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          />
          <textarea
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="Paste document text here..."
            rows={8}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          />
          <button
            onClick={handleIngest}
            disabled={loading || !document || !source}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg"
          >
            {loading ? "Ingesting..." : "Upload & Index"}
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ask Questions</h2>
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your documents..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
            <button
              onClick={handleQuery}
              disabled={loading || !question}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg"
            >
              Ask
            </button>
          </div>

          {answer && (
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-100 whitespace-pre-wrap">{answer}</p>
              <SourceCitation sources={sources} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
