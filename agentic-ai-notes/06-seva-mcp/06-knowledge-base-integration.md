# File 06: Knowledge Base Integration (`src/integrations/knowledge-base.js`)

## Overview
The **Knowledge Base Integration** provides support articles and FAQ entries queried by the MCP `resources` primitive and RAG tools.

---

## 1. Knowledge Base Data Structure

```javascript
const FAQ_ARTICLES = [
    {
        id: "faq-01",
        question: "What is your refund policy?",
        answer: "We offer a full 30-day money-back guarantee for items in unused original packaging."
    },
    {
        id: "faq-02",
        question: "How long does shipping take?",
        answer: "Standard domestic shipping takes 3-5 business days. Express shipping takes 1-2 business days."
    }
];
```

---

## 2. Knowledge Base Implementation (`src/integrations/knowledge-base.js`)

```javascript
export function getKnowledgeBaseArticles() {
    return [
        {
            id: "faq-01",
            question: "What is your refund policy?",
            answer: "We offer a full 30-day money-back guarantee for items in unused original packaging."
        },
        {
            id: "faq-02",
            question: "How long does shipping take?",
            answer: "Standard domestic shipping takes 3-5 business days. Express shipping takes 1-2 business days."
        }
    ];
}

export function searchKnowledgeBase(query) {
    const articles = getKnowledgeBaseArticles();
    const qLower = query.toLowerCase();
    return articles.filter(a => 
        a.question.toLowerCase().includes(qLower) || 
        a.answer.toLowerCase().includes(qLower)
    );
}
```

---

## Key Takeaways
1. Provides clean FAQ lookup integration.
2. Feeds raw content to `mcp://kb/faq` resources.
