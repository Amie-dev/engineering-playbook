# Module 30: System Design - Scalable Multi-Channel Notification Platform

## Theoretical Overview & Delivery Backbone

A **Notification Platform** (e.g., Swiggy, Uber, Amazon) delivers time-sensitive alerts to millions of users across multiple channels (**Mobile Push**, **SMS**, **Email**, **WhatsApp**).

```mermaid
flowchart TD
    EventSource["Event Source (Swiggy Order Service)"] -->|Publish Event| Gateway["Notification Gateway Router"]
    
    Gateway -->|1. Resolve User Preferences| Prefs[("User Preference Store (Redis)")]
    Gateway -->|2. Check Rate Limits| RateLimiter["Notification Rate Limiter"]
    
    RateLimiter -->|3. Enqueue by Priority| PriorityQ{"Priority Queue (Redis ZSET)"}
    
    PriorityQ -->|Priority 1: Critical (OTP / Order)| PriorityWorker["Critical Worker Pool"]
    PriorityQ -->|Priority 4: Low (Promos)| MarketingWorker["Marketing Worker Pool"]
    
    PriorityWorker -->|Render Template| TemplateEng["Template Engine"]
    TemplateEng --> PushVendor["Push Provider (FCM / APNS)"]
    TemplateEng --> SMSVendor["SMS Provider (Twilio / Kaleyra)"]
    TemplateEng --> EmailVendor["Email Provider (SES / SendGrid)"]
```

### Real-World Case Study: Swiggy IPL Final Order Surge
During an IPL Cricket Final match night, Swiggy processes **100+ million notifications**:
- **Critical Orders**: "Order Confirmed" and "Raju is 5 mins away" must be delivered within **$< 1\text{ second}$**.
- **Marketing Offers**: "50% off Biryani" promo pushes are throttled and queued to prevent spamming users or overwhelming push provider APIs (FCM/APNS).

---

## 1. Notification Channels Comparison Matrix

| Channel | Delivery Latency | Cost per 1,000 | Primary Reach Profile | Delivery Fallback Route |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Push (FCM / APNS)**| **$< 100\text{ ms}$** | **Free** ($\$0.00$) | App installed with push enabled. | Fallback to SMS if push fails. |
| **SMS (Twilio / Kaleyra)** | $2\text{s} - 5\text{s}$ | $\approx \$2.00$ ($\text{Re } 0.15/\text{msg}$) | Any active mobile phone number. | Primary fallback for OTPs. |
| **Email (AWS SES / SendGrid)**| $5\text{s} - 30\text{s}$ | $\approx \$0.10$ ($\text{Re } 0.01/\text{msg}$) | Registered email address. | Order receipts & invoices. |
| **WhatsApp Business API** | $1\text{s} - 3\text{s}$ | $\approx \$5.00$ | WhatsApp app installed. | Premium order updates. |

---

## 2. Notification Priority Tiers

| Priority Level | Classification | Notification Types | Processing Behavior | Rate Limit Exemption |
| :--- | :--- | :--- | :--- | :--- |
| **Priority 1** | **CRITICAL** | OTP Codes, Payment Failed, Order Confirmed. | **Instant Execution** (Bypasses queues & quiet hours). | **Exempt** from rate limits. |
| **Priority 2** | **HIGH** | Delivery Arriving, Out for Delivery. | Processed within $< 2$ seconds. | Enforces hourly limits. |
| **Priority 3** | **MEDIUM** | Order Delivered, Rating Requests. | Processed within $< 30$ seconds. | Respects Quiet Hours. |
| **Priority 4** | **LOW / PROMO** | Marketing Discounts, Promotional Offers. | Processed when worker pools are idle. | Enforces strict daily caps. |

---

## 3. Core Component Implementations

### 1. Multi-Queue Priority Engine (`PriorityQueue`)
```javascript
class PriorityQueue {
  constructor() {
    this.queues = { 1: [], 2: [], 3: [], 4: [] };
  }

  enqueue(item, priority) {
    this.queues[priority].push({ ...item, priority, enqueuedAt: Date.now() });
  }

  dequeue() {
    // Process Priority 1 (Critical) to Priority 4 (Low) sequentially
    for (let p = 1; p <= 4; p++) {
      if (this.queues[p].length > 0) return this.queues[p].shift();
    }
    return null;
  }
}
```

### 2. Multi-Channel Template Engine (`TemplateEngine`)
Renders localized message bodies for each channel dynamically:

```javascript
class TemplateEngine {
  constructor() { this.templates = new Map(); }

  register(id, template) { this.templates.set(id, template); }

  render(templateId, variables) {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const rendered = {};
    for (const [channel, content] of Object.entries(template.channels)) {
      let body = content.body || "";
      for (const [key, val] of Object.entries(variables)) {
        body = body.split(`{{${key}}}`).join(String(val));
      }
      rendered[channel] = { title: content.title || "", body };
    }
    return rendered;
  }
}
```

### 3. User Preferences & Rate Limiting Engine (`UserPreferences` & `RateLimiter`)
Enforces quiet hours, channel opt-outs, and hourly/daily notification caps:

```javascript
class UserPreferences {
  constructor() { this.preferences = new Map(); }

  resolveChannels(userId, notifType, notificationConfig) {
    const userPref = this.preferences.get(userId);
    if (!userPref) return [];

    // Check if category (e.g. "marketing") is disabled by user
    if (!userPref.categories[notificationConfig.category]) return [];

    // Filter channels enabled by user preference
    return notificationConfig.channels.filter((ch) => userPref.channels[ch]);
  }
}

class RateLimiter {
  constructor() {
    this.limits = { push: { perHour: 10 }, sms: { perHour: 3 }, email: { perHour: 2 } };
    this.counters = new Map();
  }

  checkAndIncrement(userId, channel, priority) {
    if (priority === 1) return { allowed: true, reason: "CRITICAL_BYPASS" }; // OTPs bypass limits!

    const key = `${userId}:${channel}`;
    if (!this.counters.has(key)) this.counters.set(key, { count: 0 });
    const userCounter = this.counters.get(key);
    const limit = this.limits[channel];

    if (userCounter.count >= limit.perHour) {
      return { allowed: false, reason: "HOURLY_RATE_LIMIT_EXCEEDED" };
    }

    userCounter.count++;
    return { allowed: true };
  }
}
```

---

## 4. End-to-End Router Architecture

```javascript
class NotificationRouter {
  constructor(preferences, rateLimiter, templateEngine) {
    this.preferences = preferences;
    this.rateLimiter = rateLimiter;
    this.templateEngine = templateEngine;
  }

  route(userId, notifType, variables, notifConfig) {
    // 1. Resolve User Channel Preferences
    const channels = this.preferences.resolveChannels(userId, notifType, notifConfig);
    if (!channels.length) return { status: "SKIPPED_USER_OPT_OUT" };

    const deliveries = [];
    channels.forEach((ch) => {
      // 2. Enforce Rate Limiting
      const check = this.rateLimiter.checkAndIncrement(userId, ch, notifConfig.priority);
      if (!check.allowed) return;

      // 3. Render Channel Payload & Dispatch to Provider Worker
      const rendered = this.templateEngine.render(notifType, variables);
      deliveries.push({ channel: ch, payload: rendered[ch] });
    });

    return { status: "DELIVERED", deliveries };
  }
}
```

---

## Key Takeaways

1. **Prioritize Critical Notifications**: Use Priority Queues to ensure OTPs and order status updates bypass low-priority marketing promos.
2. **Exempt Critical Messages from Rate Limits**: OTP codes and transaction alerts must always bypass user rate limits and quiet hours.
3. **Respect User Preferences**: Honor user opt-out preferences per category and channel to prevent app uninstalls.
4. **Implement Delivery Fallbacks**: Route failed push notifications to SMS automatically to guarantee critical delivery.
