// Few-shot examples teach the model by showing input-output pairs

export const SUMMARIZATION_EXAMPLES = [
  {
    role: "user",
    content: `Summarize this article:
India's electric vehicle market grew 45% in 2024, driven by government subsidies under the FAME-II scheme and increasing fuel costs. Tata Motors led the passenger EV segment with 65% market share, while Ola Electric dominated two-wheelers. Analysts predict the market will reach $100 billion by 2030.`
  },
  {
    role: "model",
    content: `**Summary:** India's EV market saw 45% growth in 2024, fueled by FAME-II subsidies and rising fuel prices. Tata Motors commands 65% of passenger EVs, with Ola Electric leading two-wheelers. The market is projected to hit $100 billion by 2030.

**Key Points:**
- 45% year-over-year growth
- Government subsidies as primary driver
- Market leaders: Tata Motors (cars), Ola Electric (two-wheelers)
- $100B projected market size by 2030`
  },
  {
    role: "user",
    content: `Summarize this article:
UPI transactions crossed 14 billion in December 2024, marking India's digital payments revolution. Small merchants in tier-2 and tier-3 cities now account for 40% of all UPI transactions. PhonePe and Google Pay together hold 85% market share. The RBI is exploring UPI integration with 5 more countries.`
  },
  {
    role: "model",
    content: `**Summary:** UPI hit a record 14 billion monthly transactions in December 2024, with small-town merchants driving 40% of volume. PhonePe and Google Pay dominate with 85% combined share. RBI plans to expand UPI internationally to 5 additional countries.

**Key Points:**
- 14 billion transactions in single month
- Tier-2/3 cities driving 40% of transactions
- PhonePe + Google Pay = 85% market share
- International expansion planned to 5 countries`
  }
];

export const SENTIMENT_EXAMPLES = [
  {
    role: "user",
    content: `Analyze sentiment: "The new Bangalore metro extension is fantastic! Finally, commuters from Whitefield can reach MG Road in 30 minutes instead of 2 hours in traffic."`
  },
  {
    role: "model",
    content: `{
  "sentiment": "positive",
  "confidence": 0.92,
  "reasoning": "Strongly positive language ('fantastic', 'finally') expressing relief and satisfaction about infrastructure improvement.",
  "key_phrases": ["fantastic", "finally", "30 minutes instead of 2 hours"]
}`
  },
  {
    role: "user",
    content: `Analyze sentiment: "Another startup layoff wave hits Gurugram. Over 2000 employees lost jobs this quarter as funding winter continues."`
  },
  {
    role: "model",
    content: `{
  "sentiment": "negative",
  "confidence": 0.88,
  "reasoning": "Negative framing of job losses with words like 'layoff wave' and 'funding winter' indicating economic distress.",
  "key_phrases": ["layoff wave", "lost jobs", "funding winter continues"]
}`
  }
];

export const CATEGORIZATION_EXAMPLES = [
  {
    role: "user",
    content: `Categorize: "ISRO successfully launched Chandrayaan-4 mission components, marking India's next step toward a lunar sample return by 2028."`
  },
  {
    role: "model",
    content: `{
  "primary_category": "Science",
  "secondary_categories": ["Technology"],
  "reasoning": "Space exploration mission by ISRO is primarily science, with technology as a secondary aspect."
}`
  }
];
