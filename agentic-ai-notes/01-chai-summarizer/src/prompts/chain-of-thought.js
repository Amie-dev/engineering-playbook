// Chain-of-thought prompts force the model to show its reasoning step by step

export const COT_SUMMARIZE = `Analyze this article step by step:

Step 1 - Identify the main topic: What is this article primarily about?
Step 2 - Extract key facts: List the 3-5 most important facts or data points.
Step 3 - Identify the author's conclusion: What is the main takeaway?
Step 4 - Generate summary: Write a concise summary using the above analysis.

Article to analyze:
{article}

Respond in this JSON format:
{
  "step1_topic": "...",
  "step2_key_facts": ["...", "..."],
  "step3_conclusion": "...",
  "step4_summary": "..."
}`;

export const COT_SENTIMENT = `Analyze the sentiment of this text step by step:

Step 1 - Identify emotional words: List words or phrases that carry emotional weight.
Step 2 - Determine direction: Is each emotional word positive, negative, or neutral?
Step 3 - Assess overall tone: Considering all words together, what is the overall sentiment?
Step 4 - Rate confidence: How confident are you in this assessment (0-1)?

Text to analyze:
{text}

Respond in this JSON format:
{
  "step1_emotional_words": [{"word": "...", "emotion": "..."}],
  "step2_directions": [{"word": "...", "direction": "positive|negative|neutral"}],
  "step3_overall": "positive|negative|neutral",
  "step4_confidence": 0.0,
  "reasoning": "..."
}`;

export const COT_CATEGORIZE = `Classify this content step by step:

Step 1 - Identify keywords: What are the domain-specific terms in the text?
Step 2 - Map to categories: Which categories do these keywords belong to?
Step 3 - Rank categories: Which category has the most keyword matches?
Step 4 - Final classification: Pick the best primary and secondary categories.

Categories: Technology, Business, Sports, Entertainment, Politics, Science, Health, Education, Lifestyle

Text to classify:
{text}

Respond in this JSON format:
{
  "step1_keywords": ["...", "..."],
  "step2_category_mapping": [{"keyword": "...", "category": "..."}],
  "step3_ranking": [{"category": "...", "match_count": 0}],
  "step4_primary": "...",
  "step4_secondary": ["..."]
}`;

// Helper to fill in the template with actual content
export function buildCoTPrompt(template, variables) {
  let prompt = template;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.split(`{${key}}`).join(value);
  }
  return prompt;
}
