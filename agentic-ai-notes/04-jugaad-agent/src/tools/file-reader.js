import { readFile } from "fs/promises";
import { resolve } from "path";

const ALLOWED_DIR = resolve("./data");
const MAX_SIZE = 50000;

export async function fileReader({ filename }) {
  const full = resolve(ALLOWED_DIR, filename);
  if (!full.startsWith(ALLOWED_DIR)) {
    return { error: "Access denied: path traversal not allowed" };
  }

  try {
    const content = await readFile(full, "utf-8");
    if (content.length > MAX_SIZE) {
      return { filename, content: content.slice(0, MAX_SIZE), truncated: true };
    }
    return { filename, content, truncated: false };
  } catch (err) {
    return { error: `Could not read file: ${err.message}` };
  }
}
