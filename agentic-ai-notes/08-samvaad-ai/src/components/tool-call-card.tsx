"use client";

interface Props {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export function ToolCallCard({ name, args, result }: Props) {
  return (
    <div className="border border-yellow-800 bg-yellow-950 rounded-lg p-3 mb-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-400 font-mono font-bold">{name}</span>
        <span className="text-yellow-600 text-xs">tool call</span>
      </div>
      <div className="bg-gray-900 rounded p-2 mb-2">
        <p className="text-gray-400 text-xs mb-1">Arguments</p>
        <pre className="text-gray-300 text-xs overflow-x-auto">
          {JSON.stringify(args, null, 2)}
        </pre>
      </div>
      {result && (
        <div className="bg-gray-900 rounded p-2">
          <p className="text-gray-400 text-xs mb-1">Result</p>
          <pre className="text-green-400 text-xs overflow-x-auto">
            {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
