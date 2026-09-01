# Module 28: System Design - News Feed Architecture & Hybrid Fan-Out

## Theoretical Overview & Core Challenges

A **News Feed System** (e.g., Instagram, Twitter/X, LinkedIn) aggregates, ranks, and delivers a personalized stream of content posted by friends and followed accounts.

```mermaid
flowchart TD
    subgraph Publisher Tier
        UserA["Normal User (100 Followers)"]
        CelebB["Celebrity (Virat Kohli - 270M Followers)"]
    end

    subgraph Hybrid Fan-Out Processing Engine
        UserA -->|1a. Push Model (Fan-Out on Write)| PrecomputedFeed[("Pre-computed Feed Cache (Redis)")]
        CelebB -->|1b. Pull Model (Store in Post DB Only)| PostDB[("Celebrity Post Store DB")]
    end

    subgraph Reader Tier & Feed Aggregation
        ClientReader["User C Opening App"] -->|2. Query Feed| FeedService["Feed Merging & Ranking Engine"]
        FeedService -->|3a. Read Pre-computed Feed| PrecomputedFeed
        FeedService -->|3b. Pull Celebrity Posts| PostDB
        FeedService -->|4. Merge & Rank ML Model| ClientReader
```

### Real-World Case Study: Instagram India & The Celebrity Problem
When cricket star Virat Kohli (270 Million followers) posts a photo:
- **Fan-Out on Write Flaw**: Emitting 270 million cache writes per post at $1\mu\text{s}$ per write takes **4.5 minutes**, causing high server load and delayed post visibility.
- **Hybrid Fan-Out Solution**: Instagram uses **Push (Fan-Out on Write)** for normal users ($< 100,000$ followers) and **Pull (Fan-Out on Read)** for celebrities ($> 100,000$ followers).

---

## 1. Fan-Out Strategies Comparison Matrix

| Strategy | Write Pipeline | Read Pipeline | System Bottleneck | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **Push Model (Fan-Out on Write)** | Post is immediately pushed to every follower's feed cache. | **Ultra-Fast ($\mathcal{O}(1)$ read)** from Redis cache. | **Celebrity Write Spike** (Millions of writes per post). | Low-follower users ($< 100,000$ followers). |
| **Pull Model (Fan-Out on Read)** | Post is written once to author's timeline database. | **Slow ($\mathcal{O}(F)$ read)**: Aggregates followees' posts. | Read Latency for users following 500+ accounts. | Celebrities & High-Follower accounts ($> 100,000$). |
| **Hybrid Model** | Push for normal users; Pull for celebrities. | Merges pre-computed cache with celebrity pulls. | Requires dynamic follower-threshold routing. | **Production Scale** (Instagram, Twitter). |

---

## 2. Core Fan-Out Implementations & Code Models

### 1. Hybrid Fan-Out Engine (`HybridFeedService`)
```javascript
class HybridFeedService {
  constructor(socialGraph) {
    this.graph = socialGraph;
    this.precomputedFeeds = new Map();
    this.celebrityPosts = new Map();
  }

  publish(post) {
    const author = this.graph.getUser(post.authorId);
    
    // 1. Pull Model for Celebrities (>100k Followers)
    if (author.isCelebrity) {
      if (!this.celebrityPosts.has(post.authorId)) this.celebrityPosts.set(post.authorId, []);
      this.celebrityPosts.get(post.authorId).unshift(post);
      return { strategy: "PULL_ON_READ", writeOps: 1 };
    }

    // 2. Push Model for Normal Users (<100k Followers)
    const followers = this.graph.getFollowers(post.authorId);
    followers.forEach((followerId) => {
      if (!this.precomputedFeeds.has(followerId)) this.precomputedFeeds.set(followerId, []);
      this.precomputedFeeds.get(followerId).unshift({
        postId: post.id,
        authorId: post.authorId,
        content: post.content,
        timestamp: post.timestamp,
        source: "PUSH",
      });
    });
    return { strategy: "PUSH_ON_WRITE", writeOps: followers.length };
  }

  getFeed(userId, limit = 10) {
    const pushFeed = (this.precomputedFeeds.get(userId) || []).slice(0, limit * 2);
    const celebrityEntries = [];

    // Pull posts from followed celebrities
    this.graph.getFollowees(userId).forEach((followeeId) => {
      const followee = this.graph.getUser(followeeId);
      if (followee && followee.isCelebrity) {
        const posts = (this.celebrityPosts.get(followeeId) || []).slice(0, 10);
        celebrityEntries.push(...posts.map((p) => ({ ...p, source: "PULL" })));
      }
    });

    // Merge and sort chronologically or by rank score
    const merged = [...pushFeed, ...celebrityEntries].sort((a, b) => b.timestamp - a.timestamp);
    return merged.slice(0, limit);
  }
}
```

---

## 3. Feed Ranking Algorithm Engine (`FeedRanker`)

Chronological feeds have been replaced by machine-learning rankers that compute a relevance score per candidate post.

```mermaid
flowchart LR
    CandidatePosts["Candidate Posts Pool"] --> FeatureEng["Feature Extraction"]
    
    subgraph Scoring Weights
        FeatureEng --> Recency["Recency Decay: e^(-t/24h)"]
        FeatureEng --> Engagement["Engagement Ratio (Likes / Comments)"]
        FeatureEng --> Affinity["User-Author Relationship Score"]
        FeatureEng --> Diversity["Author Diversity Penalty"]
    end

    Scoring Weights --> FinalScore["Final Weighted Rank Score"]
    FinalScore --> SortedFeed["Rank-Ordered User Feed"]
```

```javascript
class FeedRanker {
  constructor() {
    this.weights = { recency: 0.3, engagement: 0.25, relationship: 0.25, contentType: 0.1, diversity: 0.1 };
  }

  rankFeed(entries, viewerContext) {
    const authorAppearances = {};

    const scoredEntries = entries.map((entry) => {
      const ageHours = (Date.now() - entry.timestamp) / 3600000;
      const recencyScore = Math.exp(-ageHours / 24); // Exponential decay
      const engagementScore = Math.min(1, ((entry.likes || 0) + (entry.comments || 0) * 2) / 10000);
      const relationshipScore = Math.min(1, (viewerContext.interactions[entry.authorId] || 0) / 50);

      // Diversity Penalty: Reduce score if author already appeared multiple times
      const appearances = authorAppearances[entry.authorId] || 0;
      const diversityScore = Math.max(0, 1 - appearances * 0.3);
      authorAppearances[entry.authorId] = appearances + 1;

      const finalRankScore =
        recencyScore * this.weights.recency +
        engagementScore * this.weights.engagement +
        relationshipScore * this.weights.relationship +
        diversityScore * this.weights.diversity;

      return { ...entry, rankScore: parseFloat(finalRankScore.toFixed(4)) };
    });

    return scoredEntries.sort((a, b) => b.rankScore - a.rankScore);
  }
}
```

---

## 4. Cursor-Based Pagination vs. Offset Pagination (`PaginatedFeed`)

In real-time news feeds, using **Offset Pagination** (`OFFSET 20 LIMIT 10`) causes duplicate or skipped posts when new items are inserted at the top of the stream. **Cursor-Based Pagination** uses a timestamp or post ID pointer:

```javascript
class PaginatedFeed {
  constructor() { this.allPosts = []; }

  getPageCursor(cursorTimestamp, limit = 10) {
    let startIdx = 0;
    if (cursorTimestamp) {
      startIdx = this.allPosts.findIndex((p) => p.timestamp < cursorTimestamp);
      if (startIdx === -1) startIdx = this.allPosts.length;
    }

    const items = this.allPosts.slice(startIdx, startIdx + limit);
    const nextCursor = items.length > 0 ? items[items.length - 1].timestamp : null;

    return {
      items,
      nextCursor,
      hasMore: startIdx + limit < this.allPosts.length,
    };
  }
}
```

---

## Key Takeaways

1. **Solve Celebrity Spikes with Hybrid Fan-Out**: Use Push for normal users to maintain fast read feeds and Pull for celebrity accounts to prevent write bottlenecks.
2. **Rank Beyond Chronology**: Combine recency decay, user affinity, engagement metrics, and diversity penalties to score feeds.
3. **Use Cursor Pagination for Infinite Scroll**: Always prefer timestamp/ID cursors over SQL offsets to avoid duplicate post rendering during continuous inserts.
4. **Cache Pre-Computed Feeds in Redis**: Pre-computed feeds belong in in-memory Redis sorted sets (`ZSET`) keyed by `user_id`.
