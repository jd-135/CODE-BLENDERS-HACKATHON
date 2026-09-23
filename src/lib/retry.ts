export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Executes an asynchronous function with exponential backoff and jitter.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 300,
    maxDelayMs = 3000,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate exponential delay with randomized jitter (+-20%)
      const jitter = delay * 0.2 * (Math.random() * 2 - 1);
      const sleepTime = Math.min(maxDelayMs, delay + jitter);
      
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
      delay *= backoffFactor;
    }
  }
}
