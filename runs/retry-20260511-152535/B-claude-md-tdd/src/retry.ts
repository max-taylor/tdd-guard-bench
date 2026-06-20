export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number
    baseDelayMs: number
    shouldRetry: (error: unknown) => boolean
  }
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!options.shouldRetry(err)) throw err
      if (attempt < options.maxAttempts) {
        const retryAfter = (err as { retryAfterMs?: unknown })?.retryAfterMs
        let delay: number
        if (
          typeof retryAfter === 'number' &&
          Number.isFinite(retryAfter) &&
          retryAfter >= 0
        ) {
          delay = retryAfter
        } else {
          const base = options.baseDelayMs * Math.pow(2, attempt - 1)
          delay = base * (0.5 + Math.random() * 0.5)
        }
        await new Promise<void>((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}
