import Link from "next/link";

const modes = [
  {
    title: "Chat",
    description: "Stream AI responses in real-time with OpenAI or Gemini",
    href: "/chat",
    icon: "💬",
    features: ["Streaming responses", "Multi-model support", "Cost tracking"],
  },
  {
    title: "RAG Search",
    description: "Upload documents and ask questions with source citations",
    href: "/search",
    icon: "🔍",
    features: ["Vector search", "Source citations", "Document upload"],
  },
  {
    title: "Agents",
    description: "AI with tools — watch it call functions to answer questions",
    href: "/agents",
    icon: "🤖",
    features: ["Tool calling", "Weather & calculator", "Live tool results"],
  },
];

export default function Home() {
  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">SamvaadAI</h1>
        <p className="text-gray-400 text-lg">
          Three modes of AI interaction, one platform
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {modes.map((mode) => (
          <Link
            key={mode.title}
            href={mode.href}
            className="block border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition bg-gray-900"
          >
            <div className="text-3xl mb-4">{mode.icon}</div>
            <h2 className="text-xl font-semibold mb-2">{mode.title}</h2>
            <p className="text-gray-400 mb-4">{mode.description}</p>
            <ul className="space-y-1">
              {mode.features.map((f) => (
                <li key={f} className="text-sm text-gray-500">
                  {f}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
