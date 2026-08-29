import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
let articles = [];

async function loadKB() {
  if (articles.length > 0) return articles;
  const raw = await readFile(join(__dirname, "../data/knowledge-base.json"), "utf-8");
  articles = JSON.parse(raw);
  return articles;
}

export async function searchKnowledgeBase(query) {
  const kb = await loadKB();
  const lower = query.toLowerCase();

  const scored = kb.map((article) => {
    const titleWords = article.title.toLowerCase().split(" ");
    const contentWords = article.content.toLowerCase().split(" ");
    const categoryMatch = lower.includes(article.category.split("-").join(" "));

    let score = 0;
    titleWords.forEach((w) => { if (lower.includes(w) && w.length > 3) score += 3; });
    contentWords.forEach((w) => { if (lower.includes(w) && w.length > 3) score += 1; });
    if (categoryMatch) score += 5;

    return { ...article, score };
  });

  return scored
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export async function getArticle(id) {
  const kb = await loadKB();
  return kb.find((a) => a.id === id) || null;
}

export async function listCategories() {
  const kb = await loadKB();
  const cats = new Set(kb.map((a) => a.category));
  return [...cats];
}
