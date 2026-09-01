# Module 24: Serverless Architecture, FaaS Cold Starts, & Step Functions

## Theoretical Overview & Serverless Paradigm

**Function-as-a-Service (FaaS)** and **Serverless Computing** allow developers to execute event-driven code without managing, provisioning, or patching infrastructure servers.

```mermaid
flowchart TD
    EventSource["Event Trigger (HTTP API / SQS / S3 / Schedule)"] --> Gateway["API Gateway / Event Router"]
    
    Gateway -->|Cold Start (~300ms Init)| Inst1["Function Instance 1 (New Container)"]
    Gateway -->|Warm Start (~10ms Reuse)| Inst2["Function Instance 2 (Warm Container)"]
    
    Inst1 --> Ephemeral["Execute Code -> Exit"]
    Inst2 --> Ephemeral
    
    Ephemeral --> ScaleZero["Scale to Zero (No charges when idle)"]
```

### Real-World Case Study: IRCTC 10:00 AM Tatkal Ticket Rush
Every morning at 10:00 AM, millions of Indian railway passengers log into IRCTC simultaneously to book Tatkal tickets:
- **Traffic Profile**: Requests spike from 100 RPS at 9:55 AM to over **80,000 requests per second at 10:00 AM**.
- **Serverless Economics**: FaaS automatically provisions 800+ function instances in seconds to handle the 30-minute peak rush, scaling down to **zero instances** for the remainder of the day—saving over 80% compared to statically provisioned EC2 clusters.

---

## 1. Traditional Servers vs. Serverless FaaS Matrix

| Dimension | Traditional Virtual Machines / Containers | Serverless FaaS (AWS Lambda / Cloud Functions) |
| :--- | :--- | :--- |
| **Provisioning** | Manual instance selection & capacity planning. | **100% Fully Managed** by cloud provider. |
| **Scaling Mechanics** | Metric auto-scaling policies (CPU / Memory). | **Instant Per-Request Scaling** ($0 \to 10,000$). |
| **Billing Model** | Pay for uptime 24/7 regardless of usage. | **Pay Per Execution Duration** (1ms granularity). |
| **Cold Starts** | N/A (Server is pre-warmed & running). | Initial container boot latency penalty (100ms–2s). |
| **Max Execution** | Unlimited runtime. | Restricted max timeout (5–15 minutes). |
| **State Persistence**| Local disk storage & in-memory session. | **Strictly Stateless** (Requires Redis / DynamoDB). |

---

## 2. Core Implementations & Code Models

### 1. Function Execution Lifecycle & Cold Start Engine (`FaaSRuntime`)
```javascript
class FaaSRuntime {
  constructor() {
    this.instances = {};
    this.nextId = 0;
  }

  invoke(fnName, payload) {
    let inst = this.instances[fnName];
    let coldStart = false;
    let initTime = 0;

    if (!inst || inst.state === "terminated") {
      coldStart = true;
      initTime = 200 + Math.floor(Math.random() * 300); // 200-500ms Container Boot
      inst = { id: `inst-${++this.nextId}`, fnName, state: "running", invocations: 0 };
      this.instances[fnName] = inst;
    }

    const execTime = 10 + Math.floor(Math.random() * 50);
    inst.invocations++;
    const totalDuration = (coldStart ? initTime : 0) + execTime;

    return { status: 200, duration: totalDuration, coldStart };
  }

  idle(fnName) {
    if (this.instances[fnName]) this.instances[fnName].state = "terminated"; // Scale to zero
  }
}
```

### 2. Event Trigger Engine (`TriggerSystem`)
```javascript
class TriggerSystem {
  constructor(runtime) {
    this.runtime = runtime;
    this.triggers = [];
  }

  register(type, fnName) {
    this.triggers.push({ type, fnName });
  }

  fire(type, payload) {
    const matching = this.triggers.filter((t) => t.type === type);
    matching.forEach((t) => this.runtime.invoke(t.fnName, payload));
  }
}
```

---

## 3. Step Functions: Serverless Workflow Orchestration

Because FaaS functions are stateless and time-limited, complex multi-step business transactions are coordinated using **Step Functions** (State Machines).

```mermaid
flowchart TD
    Step1["Step 1: SearchTrains (FaaS)"] --> Step2["Step 2: ReserveSeat (FaaS)"]
    Step2 --> Step3{"Step 3: ProcessPayment (FaaS)"}
    
    Step3 -->|Success| Step4["Step 4: ConfirmBooking (FaaS)"]
    Step3 -->|Failure (Timeout / Declined)| Comp["Compensating Rollback Actions"]
    
    Comp --> ReleaseSeat["Release Reserved PNR Seat"]
```

```javascript
class StepFunction {
  constructor(name) {
    this.name = name;
    this.steps = [];
  }

  addStep(name, handler, compensator = null) {
    this.steps.push({ name, handler, compensator });
  }

  execute(input) {
    let ctx = { ...input };
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      try {
        const res = step.handler(ctx);
        ctx = { ...ctx, ...res };
      } catch (err) {
        // Execute compensating steps in reverse order!
        for (let j = i - 1; j >= 0; j--) {
          if (this.steps[j].compensator) this.steps[j].compensator(ctx);
        }
        return { status: "FAILED", error: err.message };
      }
    }
    return { status: "COMPLETED", result: ctx };
  }
}
```

---

## 4. Cold Start Mitigations & Financial Cost Analysis

### 1. Cold Start Mitigation Strategies
1. **Provisioned Concurrency**: Pre-warms $N$ function instances prior to known traffic spikes (e.g., pre-warming 500 instances at 9:55 AM before Tatkal).
2. **Artifact Reduction**: Tree-shake dependencies to reduce zip deployment size; save 100ms–300ms in container extraction.
3. **Language Selection**: Node.js/Python cold starts ($\approx 100\text{ms}$) execute faster than Java/Go cold starts ($\approx 1\text{s}–3\text{s}$).

### 2. Serverless vs. Dedicated Server Financial Economics

$$\text{Lambda Cost} = (\text{Requests} \times \text{Price}_{\text{req}}) + (\text{Invocations} \times \text{Duration} \times \text{Memory} \times \text{Price}_{\text{GB-s}})$$

- **Low / Bursty Workload ($10,000$ req/day)**: Serverless ($\approx \$0.10/\text{mo}$) beats Dedicated VM ($\approx \$30/\text{mo}$).
- **High Steady-State Workload ($50,000,000$ req/day)**: Dedicated VM Cluster ($\approx \$300/\text{mo}$) beats Serverless ($\approx \$1,200/\text{mo}$).

---

## Key Takeaways

1. **Scale to Zero**: Serverless charges strictly per execution millisecond, eliminating idle server infrastructure costs.
2. **Mitigate Cold Starts for Latency-Sensitive APIs**: Use Provisioned Concurrency or lightweight runtimes (Node.js/Python) to bypass container boot delays.
3. **Orchestrate Micro-Workflows with Step Functions**: Use state machines with compensating rollback handlers for multi-step distributed workflows.
4. **Adopt Hybrid Architectures**: Combine Serverless for bursty spikes (Tatkal checkout) with containerized clusters (ECS/EKS) for steady-state baseline traffic.
