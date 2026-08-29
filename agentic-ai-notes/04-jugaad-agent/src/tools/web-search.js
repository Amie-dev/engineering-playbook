const searchDB = [
  { query: "gst rates india 2024", result: "Standard GST rate is 18%. Essential goods at 5%, luxury at 28%." },
  { query: "startup india benefits", result: "Tax holiday for 3 years, self-certification for labor laws, fast-track patent filing." },
  { query: "msme registration", result: "Register on udyamregistration.gov.in. Benefits include priority lending, subsidies." },
  { query: "pune coworking spaces", result: "Top options: WeWork Baner, 91springboard Hinjawadi, CoWrks Kalyani Nagar." },
  { query: "inventory management tips", result: "Use ABC analysis, set reorder points, automate stock alerts, conduct regular audits." },
];

export async function webSearch({ query }) {
  const lower = query.toLowerCase();
  const match = searchDB.find((entry) => {
    const words = entry.query.split(" ");
    return words.some((word) => lower.includes(word));
  });

  if (match) {
    return { source: "web", query, results: [match.result] };
  }

  return {
    source: "web",
    query,
    results: [`No specific results found for "${query}". Try a more specific search.`],
  };
}
