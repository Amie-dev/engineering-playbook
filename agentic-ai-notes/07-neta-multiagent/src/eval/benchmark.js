import "dotenv/config";
import { runAnalysis } from "../orchestrator/state-graph.js";
import { scoreQuality } from "./quality-scorer.js";

const BENCHMARK_TOPICS = [
  "Mumbai pothole crisis and BMC budget allocation 2026",
  "Delhi air pollution policy effectiveness",
  "Bengaluru water crisis and lake restoration efforts",
];

async function runBenchmark() {
  console.log("=== NetaWatch Benchmark Suite ===\n");

  const results = [];

  for (const topic of BENCHMARK_TOPICS) {
    console.log(`\n--- Evaluating: ${topic} ---`);

    try {
      const analysis = await runAnalysis(topic);
      const score = await scoreQuality(topic, analysis.finalOutput);

      results.push({
        topic,
        elapsed: analysis.elapsed,
        revisions: analysis.revisionCount,
        score,
      });

      console.log(`Score: ${score.overall}/10 (${score.reasoning})`);
    } catch (err) {
      console.error(`Failed: ${err.message}`);
      results.push({ topic, error: err.message });
    }
  }

  console.log("\n=== Benchmark Summary ===");
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.topic}: ERROR - ${r.error}`);
    } else {
      console.log(`  ${r.topic}: ${r.score.overall}/10 (${r.elapsed})`);
    }
  }

  const validScores = results.filter((r) => r.score).map((r) => r.score.overall);
  if (validScores.length > 0) {
    const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    console.log(`\nAverage score: ${avg.toFixed(1)}/10`);
  }
}

runBenchmark().catch(console.error);
