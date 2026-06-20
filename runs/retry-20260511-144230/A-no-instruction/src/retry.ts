export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  shouldRetry: (error: unknown) => boolean
  sleep?: (ms: number) => Promise<void>
  random?: () => number
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export function computeDelay(
  attempt: number,
  baseDelayMs: number,
  random: () => number = Math.random
): number {
  const exponential = baseDelayMs * 2 ** (attempt - 1)
  const jitter = random() * exponential
  return exponential + jitter
}

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

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!shouldRetry(error)) throw error
      if (attempt === maxAttempts) throw error
      const serverDelay = extractRetryAfterMs(error)
      const delay =
        serverDelay ?? computeDelay(attempt, baseDelayMs, random)
      await sleep(delay)
    }
  }
  throw lastError
}

function extractRetryAfterMs(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const value = (error as { retryAfterMs?: unknown }).retryAfterMs
  if (typeof value !== 'number') return undefined
  if (!Number.isFinite(value) || value < 0) return undefined
  return value
}
