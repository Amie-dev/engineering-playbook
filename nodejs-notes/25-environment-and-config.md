# Module 25: Environment Variables and Configuration Management

## Overview

Following the **Twelve-Factor App Methodology**, application configuration—such as database connection strings (`DATABASE_URL`), secret encryption keys (`JWT_SECRET`), external API endpoints, and listening ports (`PORT`) — should strictly be decoupled from source code and injected via **Environment Variables** (`process.env`).

Beginning in Node.js 20.6+, Node.js includes native support for loading `.env` files directly via the **`--env-file`** CLI flag, eliminating the mandatory dependency on third-party packages like `dotenv` for simple use cases.

---

## 1. Twelve-Factor Configuration Pipeline

```mermaid
flowchart LR
    EnvFile[".env / .env.production File"] --> NativeFlag["Node.js Native Flag: node --env-file=.env app.js"]
    OSInject["OS / Docker Container Environment"] --> ProcessEnv["process.env Namespace"]
    NativeFlag --> ProcessEnv
    
    ProcessEnv --> SchemaValidator["Fail-Fast Schema Validator (Zod / Joi / Custom Guard)"]
    SchemaValidator -->|Validation Pass| AppConfig["Frozen Config Object (AppConfig.dbUrl)"]
    SchemaValidator -.->|Missing Required Variable| CrashExit["CRASH AT STARTUP! (Exit Code 1)"]
```

---

## 2. Native Node.js `--env-file` Flag Support (Node 20.6+)

Node.js 20.6.0 introduced native `.env` file parsing built directly into the runtime binary:

```bash
# Load default .env file into process.env at startup:
node --env-file=.env server.js

# Load environment-specific file:
node --env-file=.env.production server.js
```

### `.env` File Format Syntax

```ini
# Lines starting with # are comments
PORT=8080
NODE_ENV=production
DATABASE_URL="postgres://admin:secret123@db.example.com:5432/main_db"
API_TIMEOUT_MS=5000
ENABLE_FEATURE_FLAG_X=true
```

---

## 3. Fail-Fast Startup Schema Validation Architecture

A common bug in production is deploying code that crashes 3 hours later when a specific route executes because `process.env.STRIPE_API_KEY` was undefined.

**Fail-Fast Strategy**: Validate and parse all environment variables **synchronously during application initialization**. If any mandatory variable is missing or improperly formatted, terminate the process immediately!

```mermaid
sequenceDiagram
    autonumber
    actor Boot as Node.js Process Boot
    participant Loader as Environment Loader
    participant Validator as Strict Schema Validator
    participant App as Web Server Instance

    Boot->>Loader: Read process.env
    Loader->>Validator: Pass raw string dictionary
    
    alt All Required Variables Valid
        Validator-->>Boot: Return typed, validated AppConfig object
        Boot->>App: Initialize database connections & start server
    else Missing DATABASE_URL or Invalid PORT
        Validator-->>Boot: Print detailed missing configuration errors
        Boot->>Boot: process.exit(1) (CRASH IMMEDIATELY AT STARTUP!)
    end
```

---

## 4. Production Fail-Fast Environment Config Loader Code

```javascript
const fs = require("node:fs");
const path = require("node:path");

class EnvironmentConfig {
  constructor() {
    this.config = null;
  }

  // Fallback custom .env parser for pre-Node 20 environments
  static parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) continue;

      const equalIdx = trimmed.indexOf("=");
      if (equalIdx === -1) continue;

      const key = trimmed.slice(0, equalIdx).trim();
      let val = trimmed.slice(equalIdx + 1).trim();

      // Strip surrounding quotes
      val = val.replace(/^["']|["']$/g, "");

      // Do NOT overwrite existing OS environment variables
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }

  // Fail-Fast Validator
  static initialize() {
    // 1. Attempt fallback load if process.env is empty
    EnvironmentConfig.parseEnvFile(path.join(__dirname, ".env"));

    // 2. Define expected schema & default fallbacks
    const schema = {
      NODE_ENV: { type: "string", default: "development", enum: ["development", "staging", "production"] },
      PORT: { type: "number", default: 3000 },
      DATABASE_URL: { type: "string", required: true }, // Mandatory!
      JWT_SECRET: { type: "string", required: true, minLength: 16 } // Mandatory!
    };

    const validatedConfig = {};
    const errors = [];

    for (const [key, rule] of Object.entries(schema)) {
      let rawValue = process.env[key];

      // Use fallback default if missing
      if (rawValue === undefined || rawValue === "") {
        if (rule.required) {
          errors.push(`Missing mandatory environment variable: '${key}'`);
          continue;
        }
        rawValue = rule.default;
      }

      // Type parsing & validation
      if (rule.type === "number") {
        const parsedNum = Number(rawValue);
        if (Number.isNaN(parsedNum)) {
          errors.push(`Environment variable '${key}' must be a valid number. Received: "${rawValue}"`);
        } else {
          validatedConfig[key] = parsedNum;
        }
      } else if (rule.type === "string") {
        if (rule.enum && !rule.enum.includes(rawValue)) {
          errors.push(`Environment variable '${key}' must be one of [${rule.enum.join(", ")}]. Received: "${rawValue}"`);
        } else if (rule.minLength && rawValue.length < rule.minLength) {
          errors.push(`Environment variable '${key}' must be at least ${rule.minLength} chars long.`);
        } else {
          validatedConfig[key] = String(rawValue);
        }
      }
    }

    // Fail-Fast: If errors exist, print report and terminate process!
    if (errors.length > 0) {
      console.error("\nCRITICAL: ENVIRONMENT CONFIGURATION VALIDATION FAILED:");
      errors.forEach((err) => console.error(`  - ${err}`));
      console.error("\nApplication startup aborted. Fix missing .env variables and restart.\n");
      process.exit(1);
    }

    // Freeze configuration object to prevent runtime tampering
    return Object.freeze(validatedConfig);
  }
}

// Global Application Configuration Instance
// In real apps, set process.env.DATABASE_URL and process.env.JWT_SECRET prior to initializing
process.env.DATABASE_URL = "postgres://admin:secret@localhost:5432/app_db";
process.env.JWT_SECRET = "SUPER_SECURE_SECRET_KEY_99812";

const AppConfig = EnvironmentConfig.initialize();

console.log("SUCCESS: Environment validated cleanly!");
console.log("App Running Mode :", AppConfig.NODE_ENV);
console.log("Port Listener    :", AppConfig.PORT);
console.log("Database String  :", AppConfig.DATABASE_URL);
```

---

## Key Production Takeaways

1. **NEVER Commit `.env` Files to Version Control**: Always add `.env`, `.env.local`, and `.env.production` to `.gitignore`. Commit a sample template file named `.env.example` containing non-secret key placeholders instead.
2. **Implement Fail-Fast Validation at Startup**: Use Zod (`z.object({...})`) or custom validators to check `process.env` during process boot. It is far better for a process to crash in 100ms with a clear missing key message than fail silently hours later.
3. **Use Node.js Native `--env-file` Flag**: For Node.js 20+, run `node --env-file=.env server.js` to eliminate external npm dependencies for `.env` loading.
4. **Freeze the Configuration Object**: Call `Object.freeze(config)` after validation to prevent application code from accidentally mutating configuration properties at runtime.

