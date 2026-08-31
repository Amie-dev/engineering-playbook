# Module 01: How Large Language Models (LLMs) Work

## Overview

**Large Language Models (LLMs)** like GPT-4, Claude 3.5, and Gemini 1.5 are auto-regressive Transformer neural networks trained on multi-terabyte textual corpora. At their foundational computational core, LLMs are statistical **next-token predictors**. Given an input sequence of tokens (a prompt), an LLM calculates a probability distribution across its vocabulary to predict and generate subsequent tokens iteratively.

Understanding **Transformer Self-Attention Mechanics**, **BPE Tokenization**, **Logits & Softmax Sampling Strategies (Temperature, Top-P, Top-K)**, and **RLHF Alignment** is fundamental to building reliable agentic AI systems.

---

## 1. Transformer Architecture & Token Generation Pipeline

```mermaid
flowchart TD
    Prompt[User Input Prompt Text] --> Tokenizer["1. Byte-Pair Encoding (BPE) Tokenizer<br/>Converts string -> Token IDs"]

    Tokenizer --> EmbedLook["2. Token Embedding & Positional Encoding<br/>Maps Token IDs -> Dense Vector Space (d_model = 4096+)"]

    EmbedLook --> TransStack["3. Multi-Head Self-Attention Transformer Layers<br/>Computes Query (Q), Key (K), Value (V) attention weights"]

    TransStack --> LogitsLayer["4. Unnormalized Logits Layer<br/>Generates raw score vector across Vocabulary (|V| = 100k+)"]

    LogitsLayer --> SoftmaxSampling["5. Temperature & Top-P / Top-K Sampling<br/>Scales logits & converts to probability distribution"]

    SoftmaxSampling --> NextToken["6. Autoregressive Next-Token Output<br/>Appends generated token to prompt context loop"]

    NextToken --> Prompt

    style TransStack fill:#dbeafe,stroke:#1d4ed8
    style SoftmaxSampling fill:#dcfce7,stroke:#15803d
```

---

## 2. Mathematical Sampling Strategies & Parameter Tuning

LLM output behavior is governed by sampling hyperparameters applied to raw output logits $z_i$ prior to the Softmax transformation:

```mermaid
flowchart TD
    Logits[Raw Output Logits z_i] --> TempScale["1. Temperature Scaling: z_i / T"]

    TempScale --> TopKFilter["2. Top-K Filtering<br/>Retains top K highest probability logits, truncating the long tail"]

    TopKFilter --> TopPFilter["3. Top-P Nucleus Filtering<br/>Retains smallest subset of logits summing to cumulative prob P (e.g., P=0.9)"]

    TopPFilter --> Softmax["4. Softmax Normalization: P(x_i) = exp(z_i / T) / sum(exp(z_j / T))"]

    Softmax --> SelectedToken["Sampled Next Token Candidate"]

    style TempScale fill:#dbeafe,stroke:#1d4ed8
    style Softmax fill:#dcfce7,stroke:#15803d
```

### Sampling Strategy Hyperparameter Matrix

| Parameter | Mathematical Range | Low Value ($0.0 - 0.2$) | High Value ($0.7 - 1.0$) | Primary Production Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **`Temperature (T)`** | $0.0 \le T \le 2.0$ | **Deterministic & Focused**: Greedy selection ($T \to 0$). Reduces hallucination risk. | **Creative & Diverse**: Flattens probability distribution, increasing variation. | Use $T=0.0$ for JSON extraction, math, and code generation. Use $T=0.7$ for creative drafting. |
| **`Top-P (Nucleus)`** | $0.0 \le P \le 1.0$ | Cuts off low-probability token tail aggressively. | Includes a broader pool of candidate tokens up to cumulative probability threshold. | Alternative to Temperature tuning; typically set $P=0.9$ while keeping Temperature fixed. |
| **`Top-K`** | $1 \le K \le |V|$ | Limits choices strictly to top $K$ most likely tokens (e.g. $K=40$). | Allows selection from thousands of candidate tokens. | Prevents model from picking extremely improbable tokens in low-resource settings. |

---

## 3. RLHF & Alignment Pipeline (Pre-training to Instruct/Chat Models)

```mermaid
sequenceDiagram
    autonumber
    participant Base as Base LLM (Raw Text Completion)
    participant SFT as Supervised Fine-Tuning (SFT)
    participant RM as Reward Model (Human Preference Scoring)
    participant Policy as PPO / DPO Policy Optimization
    participant Instruct as Instruct/Chat Aligned Model

    Base->>SFT: 1. Train on high-quality Q&A Prompt-Response Pairs
    SFT->>RM: 2. Collect multi-response rankings from human annotators
    RM->>Policy: 3. Train Reward Model to score response quality
    Policy->>Instruct: 4. Optimize model policy using Direct Preference Optimization (DPO)
    
    note over Instruct: Model becomes safe, helpful, non-toxic, and instruction-following!
```

---

## 4. Practical Implementation Showcase: Simulated Softmax & Temperature Sampler

```javascript
// Production-grade conceptual Softmax Temperature & Top-P Sampler Engine
class TokenSamplerEngine {
  constructor(vocabulary) {
    this.vocab = vocabulary;
  }

  /**
   * Applies Temperature scaling, Top-P filtering, and Softmax sampling over logits
   */
  sampleNextToken(rawLogits, temperature = 0.7, topP = 0.9) {
    if (temperature === 0.0) {
      // Greedy Decoding: Pick token with highest logit score
      let maxIdx = 0;
      for (let i = 1; i < rawLogits.length; i++) {
        if (rawLogits[i] > rawLogits[maxIdx]) maxIdx = i;
      }
      return { token: this.vocab[maxIdx], probability: 1.0 };
    }

    // 1. Temperature Scaling
    const scaledLogits = rawLogits.map((logit) => logit / temperature);

    // 2. Compute Softmax Probabilities
    const maxLogit = Math.max(...scaledLogits);
    const expValues = scaledLogits.map((l) => Math.exp(l - maxLogit)); // Subtract max for numerical stability
    const sumExp = expValues.reduce((a, b) => a + b, 0);
    let probabilities = expValues.map((v) => v / sumExp);

    // Pair probabilities with vocabulary indices and sort descending
    let tokenPairs = probabilities
      .map((prob, index) => ({ token: this.vocab[index], prob, index }))
      .sort((a, b) => b.prob - a.prob);

    // 3. Apply Top-P (Nucleus) Truncation Filter
    let cumulativeProb = 0;
    let cutoffIndex = tokenPairs.length;
    for (let i = 0; i < tokenPairs.length; i++) {
      cumulativeProb += tokenPairs[i].prob;
      if (cumulativeProb >= topP) {
        cutoffIndex = i + 1;
        break;
      }
    }
    tokenPairs = tokenPairs.slice(0, cutoffIndex);

    // Re-normalize probabilities after Top-P truncation
    const truncatedSum = tokenPairs.reduce((sum, item) => sum + item.prob, 0);
    tokenPairs.forEach((item) => (item.prob /= truncatedSum));

    // 4. Weighted Random Sampling
    const randomThreshold = Math.random();
    let acc = 0;
    for (const item of tokenPairs) {
      acc += item.prob;
      if (randomThreshold <= acc) {
        return { token: item.token, probability: item.prob };
      }
    }

    return tokenPairs[0];
  }
}

// Example Usage
const vocabulary = ["The", "agent", "executed", "the", "tool", "successfully", "error"];
const mockLogits = [1.2, 8.5, 4.2, 0.5, 6.1, 3.8, -2.4];
const sampler = new TokenSamplerEngine(vocabulary);

console.log("Greedy Choice (T=0.0):", sampler.sampleNextToken(mockLogits, 0.0));
console.log("Balanced Choice (T=0.7, P=0.9):", sampler.sampleNextToken(mockLogits, 0.7, 0.9));
```

---

## Key Production Takeaways

1. **LLMs Are Autoregressive Predictors**: LLMs generate text token-by-token. Every output token becomes part of the input context for subsequent tokens, causing inference latency to scale linearly ($O(N)$) with output sequence length.
2. **Use Temperature $0.0$ for Deterministic Agent Workflows**: When generating JSON schemas, parsing tool arguments, or evaluating code, always set `temperature: 0` to eliminate non-deterministic variance.
3. **Context Window Limits Guard Information Retrieval**: An LLM cannot process infinite text. Models enforce maximum context window limits (e.g. 128k tokens), requiring chunking and RAG for large documents.
4. **RLHF Alignment Controls Safety**: Pre-trained base models complete text rawly; RLHF/DPO instruction-tuned models convert raw base models into structured, safe conversational agents.

