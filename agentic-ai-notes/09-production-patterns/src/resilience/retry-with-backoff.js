export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = true,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        console.log(`[Retry] Succeeded on attempt ${attempt + 1}`);
      }
      return result;
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) break;

      if (error.status === 400 || error.status === 401) {
        console.log("[Retry] Non-retryable error, aborting");
        throw error;
      }

      let delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      console.log(
        `[Retry] Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${Math.round(delay)}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log(`[Retry] All ${maxRetries + 1} attempts failed`);
  throw lastError;
}
