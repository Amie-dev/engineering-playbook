# File 30: System Design — Push Notification System

## Overview
Designing a **Push Notification System** requires delivering millions of multi-channel messages (iOS APNS, Android FCM, SMS Twilio, Email SendGrid) asynchronously while supporting rate limiting, user notification preferences, and deduplication.

---

## 1. Notification Architecture Pipeline

```mermaid
flowchart TD
    Services[Microservice Event Triggers] --> Gateway[Notification API Gateway]
    Gateway --> RateLimiter[User Preference & Rate Limit Validator]

    RateLimiter --> Queue[Message Queue Broker (Kafka / SQS)]
    Queue --> Workers[Notification Worker Nodes]

    Workers --> APNS[Apple Push Notification Service (iOS)]
    Workers --> FCM[Firebase Cloud Messaging (Android)]
    Workers --> Twilio[Twilio Gateway (SMS)]
    Workers --> SendGrid[SendGrid Gateway (Email)]
```

---

## 2. Notification Dispatching Implementation

```javascript
class NotificationDispatcher {
    async sendPushNotification(userToken, title, body) {
        // Send payload to FCM / APNS Provider
        console.log(`[FCM PUSH] Token: ${userToken} | "${title}: ${body}"`);
        return { status: "SENT", messageId: `fcm_${Date.now()}` };
    }

    async sendSMS(phoneNumber, message) {
        console.log(`[TWILIO SMS] To: ${phoneNumber} | "${message}"`);
        return { status: "SENT", sid: `sms_${Date.now()}` };
    }
}
```

---

## Key Takeaways
1. Decouple notification dispatching from application logic using **Message Queues**.
2. Validate user **Notification Preferences** (dnd hours, channel opt-outs) before dispatching.
3. Integrate third-party delivery providers (FCM, APNS, Twilio) via pluggable worker interfaces.
