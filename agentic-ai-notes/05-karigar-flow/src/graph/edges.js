export function routeAfterSearch(state) {
  if (state.error) return "error";
  if (state.hasMatches) return "rankMatches";
  return "suggestUpskilling";
}

export function routeAfterRanking(state) {
  if (!state.rankedMatches || state.rankedMatches.length === 0) {
    return "suggestUpskilling";
  }

  const topMatch = state.rankedMatches[0];
  if (topMatch.verdict === "strong") return "draftEmail";
  return "suggestUpskilling";
}
