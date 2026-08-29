import { NextResponse } from "next/server";
import { ingestDocument, queryWithRAG } from "@/lib/rag";
import { validateInput } from "@/lib/guardrails";

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "ingest") {
    const { text, source } = body;
    if (!text || !source) {
      return NextResponse.json(
        { error: "text and source are required" },
        { status: 400 }
      );
    }
    const result = await ingestDocument(text, source);
    return NextResponse.json(result);
  }

  if (action === "query") {
    const { question } = body;
    const check = validateInput(question);
    if (!check.valid) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }
    const result = await queryWithRAG(question);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
