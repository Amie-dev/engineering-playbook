import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SamvaadAI",
  description: "AI Chat with 3 modes: Chat, RAG, Agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-white">
              SamvaadAI
            </a>
            <div className="flex gap-4">
              <a href="/chat" className="text-gray-400 hover:text-white transition">
                Chat
              </a>
              <a href="/search" className="text-gray-400 hover:text-white transition">
                RAG Search
              </a>
              <a href="/agents" className="text-gray-400 hover:text-white transition">
                Agents
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
