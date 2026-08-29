// 4-step summarization chain: extract → classify → summarize → format

import { SUMMARIZER_PROMPT, CONTENT_CLASSIFIER_PROMPT } from "../prompts/system-prompts.js";

// Step 1: Extract key points from the article
async function extractKeyPoints(model, article) {
  const chat = model.startChat({
    systemInstruction: SUMMARIZER_PROMPT
  });

  const result = await chat.sendMessage(
    `Extract the key points from this article as a JSON array of strings.
Only return the JSON array, nothing else.

Article: ${article}`
  );

  const text = result.response.text();

  try {
    return JSON.parse(text);
  } catch {
    // If the model didn't return clean JSON, wrap the text
    return [text];
  }
}

// Step 2: Classify the topic based on extracted points
async function classifyTopic(model, keyPoints) {
  const chat = model.startChat({
    systemInstruction: CONTENT_CLASSIFIER_PROMPT
  });

  const result = await chat.sendMessage(
    `Based on these key points, classify the topic.
Return JSON with "primary_category" and "secondary_categories" fields.

Key points: ${JSON.stringify(keyPoints)}`
  );

  try {
    return JSON.parse(result.response.text());
  } catch {
    return { primary_category: "General", secondary_categories: [] };
  }
}

// Step 3: Generate a summary using key points and classification
async function generateSummary(model, article, keyPoints, classification) {
  const chat = model.startChat({
    systemInstruction: SUMMARIZER_PROMPT
  });

  const result = await chat.sendMessage(
    `Generate a concise summary of this article.
Use these extracted key points and classification to guide your summary.

Article: ${article}
Key Points: ${JSON.stringify(keyPoints)}
Category: ${classification.primary_category}

Return only the summary text, under 150 words.`
  );

  return result.response.text();
}

// Step 4: Format the final output
function formatOutput(keyPoints, classification, summary) {
  return {
    summary,
    key_points: keyPoints,
    classification,
    word_count: summary.split(" ").length,
    generated_at: new Date().toISOString()
  };
}

// Run the full 4-step chain
export async function runSummarizeChain(model, article) {
  console.log("Step 1: Extracting key points...");
  const keyPoints = await extractKeyPoints(model, article);

  console.log("Step 2: Classifying topic...");
  const classification = await classifyTopic(model, keyPoints);

  console.log("Step 3: Generating summary...");
  const summary = await generateSummary(model, article, keyPoints, classification);

  console.log("Step 4: Formatting output...");
  const output = formatOutput(keyPoints, classification, summary);

  return output;
}
