export type RetryOptions = {
  maxAttempts: number
  baseDelayMs: number
  shouldRetry: (error: unknown) => boolean
  sleep?: (ms: number) => Promise<void>
  random?: () => number
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    shouldRetry,
    sleep = defaultSleep,
    random = Math.random,
  } = options

  let attempt = 0
  let lastError: unknown

  while (attempt < maxAttempts) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      attempt++

      if (!shouldRetry(error)) {
        throw error
      }

      if (attempt >= maxAttempts) {
        throw error
      }

      const retryAfterMs = (error as { retryAfterMs?: unknown })?.retryAfterMs
      if (
        typeof retryAfterMs === 'number' &&
        Number.isFinite(retryAfterMs) &&
        retryAfterMs >= 0
      ) {
        await sleep(retryAfterMs)
      } else {
        const exponential = baseDelayMs * Math.pow(2, attempt - 1)
        const jittered = exponential * (0.5 + random() * 0.5)
        await sleep(jittered)
      }
    }
  }

  throw lastError
}
