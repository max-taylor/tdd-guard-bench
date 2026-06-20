export type RetryOptions = {
  maxAttempts: number
  baseDelayMs: number
  shouldRetry: (error: unknown) => boolean
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let attempt = 0
  while (true) {
    attempt++
    try {
      return await fn()
    } catch (err) {
      if (attempt >= options.maxAttempts) throw err
      if (!options.shouldRetry(err)) throw err
      const retryAfterMs = (err as { retryAfterMs?: unknown })?.retryAfterMs
      let delay: number
      if (
        typeof retryAfterMs === 'number' &&
        Number.isFinite(retryAfterMs) &&
        retryAfterMs >= 0
      ) {
        delay = retryAfterMs
      } else {
        const base = options.baseDelayMs * 2 ** (attempt - 1)
        delay = base + Math.random() * base
      }
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}
