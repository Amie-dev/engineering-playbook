"use client";

interface Props {
  sources: Array<{
    title: string;
    content: string;
    score: number;
  }>;
}

export function SourceCitation({ sources }: Props) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-800 pt-3">
      <p className="text-xs text-gray-500 mb-2">Sources</p>
      <div className="space-y-2">
        {sources.map((source, i) => (
          <div
            key={i}
            className="bg-gray-900 rounded p-2 text-sm"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-300 font-medium">{source.title}</span>
              <span className="text-gray-600 text-xs">
                {(source.score * 100).toFixed(0)}% match
              </span>
            </div>
            <p className="text-gray-500 text-xs line-clamp-2">{source.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
