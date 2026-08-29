# File 35: Middleware and Plugin System Patterns

## Overview
- The **Middleware Pattern** arranges execution functions in a pipeline where each component transforms requests or handles side-effects before calling `next()`.
- The **Plugin Pattern** enables external developers to extend core system functionality without modifying core source code via lifecycle hook registrations.

---

## 1. Plugin Architecture with Lifecycle Hooks

```mermaid
flowchart TD
    CoreApp[Core Application Framework] -->|registerPlugin(plugin)| PluginRegistry[Plugin Manager]
    PluginRegistry -->|Triggers Hook| Hook1[onInit Hook Handler]
    PluginRegistry -->|Triggers Hook| Hook2[beforeRequest Hook Handler]
    PluginRegistry -->|Triggers Hook| Hook3[afterResponse Hook Handler]
```

---

## 2. Extensible Plugin System Implementation

```javascript
class ApplicationCore {
    constructor() {
        this.plugins = [];
        this.hooks = new Map();
    }

    // Hook Registration System
    on(hookName, callback) {
        if (!this.hooks.has(hookName)) this.hooks.set(hookName, []);
        this.hooks.get(hookName).push(callback);
    }

    triggerHook(hookName, payload) {
        const callbacks = this.hooks.get(hookName) || [];
        callbacks.forEach(fn => fn(payload));
    }

    // Register Plugin
    use(plugin) {
        this.plugins.push(plugin);
        plugin.install(this); // Install plugin into core
    }
}

// Custom Plugin 1: Analytics Plugin
const AnalyticsPlugin = {
    install(app) {
        app.on("user:signup", user => {
            console.log(`[ANALYTICS PLUGIN] Tracked new signup: ${user.name}`);
        });
    }
};

// Custom Plugin 2: Logger Plugin
const LoggerPlugin = {
    install(app) {
        app.on("user:signup", user => {
            console.log(`[LOGGER PLUGIN] Event logged at ${new Date().toISOString()}`);
        });
    }
};

const app = new ApplicationCore();
app.use(AnalyticsPlugin);
app.use(LoggerPlugin);

// Core fires lifecycle hooks
app.triggerHook("user:signup", { id: 101, name: "Priya" });
```

---

## Key Takeaways
1. **Plugins** extend core software without modifying framework source code.
2. Uses **Hook Registrations** (`onInit`, `beforeRequest`, `afterResponse`) to inject custom features.
3. Used extensively by frameworks like Vue, Express, Fastify, and Webpack.
