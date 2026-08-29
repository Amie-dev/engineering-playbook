"use client";

interface Props {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model: string;
}

export function CostDisplay({ inputTokens, outputTokens, cost, model }: Props) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 px-2">
      <span>{model}</span>
      <span>{inputTokens + outputTokens} tokens</span>
      <span>${cost.toFixed(6)}</span>
    </div>
  );
}
