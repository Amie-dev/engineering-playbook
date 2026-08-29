// Load text files from the sample-docs directory

import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";

export function loadDocuments(docsDir) {
  const files = readdirSync(docsDir).filter(f => f.endsWith(".txt"));

  console.log(`Found ${files.length} documents to load`);

  const documents = [];

  for (const file of files) {
    const filePath = join(docsDir, file);
    const content = readFileSync(filePath, "utf-8");

    // Extract subject from filename (e.g., "physics-mechanics.txt" -> "physics")
    const fileName = basename(file, ".txt");
    const subject = fileName.split("-")[0];
    const topic = fileName.split("-").slice(1).join(" ");

    documents.push({
      id: fileName,
      content,
      metadata: {
        source: file,
        subject,
        topic,
        char_count: content.length
      }
    });

    console.log(`Loaded: ${file} (${content.length} chars)`);
  }

  return documents;
}
