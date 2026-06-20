export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  shouldRetry: (error: unknown) => boolean
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let attempt = 0
  while (true) {
    attempt++
    try {
      return await fn()
    } catch (error) {
      if (attempt >= options.maxAttempts) throw error
      if (!options.shouldRetry(error)) throw error
      await sleep(computeDelay(attempt, options.baseDelayMs, error))
    }
  }
}

function computeDelay(
  attempt: number,
  baseDelayMs: number,
  error: unknown
): number {
  const retryAfterMs = (error as { retryAfterMs?: unknown })?.retryAfterMs
  if (
    typeof retryAfterMs === 'number' &&
    Number.isFinite(retryAfterMs) &&
    retryAfterMs >= 0
  ) {
    return retryAfterMs
  }
  const backoff = baseDelayMs * 2 ** (attempt - 1)
  const jitter = Math.random() * baseDelayMs
  return backoff + jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
