const STATES = {
  CLOSED: "closed",
  OPEN: "open",
  HALF_OPEN: "half_open",
};

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.halfOpenMax = options.halfOpenMax || 2;

    this.state = STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.halfOpenAttempts = 0;
  }

  async call(fn) {
    if (this.state === STATES.OPEN) {
      const elapsed = Date.now() - this.lastFailure;
      if (elapsed >= this.resetTimeout) {
        console.log("[CircuitBreaker] Transitioning to HALF_OPEN");
        this.state = STATES.HALF_OPEN;
        this.halfOpenAttempts = 0;
      } else {
        const waitTime = Math.round((this.resetTimeout - elapsed) / 1000);
        throw new Error(`Circuit is OPEN. Retry in ${waitTime}s`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === STATES.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.halfOpenMax) {
        console.log("[CircuitBreaker] Recovered -> CLOSED");
        this.state = STATES.CLOSED;
        this.failures = 0;
        this.successes = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === STATES.HALF_OPEN) {
      console.log("[CircuitBreaker] Failed in HALF_OPEN -> OPEN");
      this.state = STATES.OPEN;
      return;
    }

    if (this.failures >= this.failureThreshold) {
      console.log(`[CircuitBreaker] Threshold reached (${this.failures}) -> OPEN`);
      this.state = STATES.OPEN;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
    };
  }

  reset() {
    this.state = STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
  }
}
