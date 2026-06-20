export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  shouldRetry: (error: unknown) => boolean
  sleep?: (ms: number) => Promise<void>
  random?: () => number
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

function readRetryAfterMs(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null
  const value = (error as { retryAfterMs?: unknown }).retryAfterMs
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const sleep = options.sleep ?? defaultSleep
  const random = options.random ?? Math.random

  let lastError: unknown
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!options.shouldRetry(error)) throw error
      if (attempt < options.maxAttempts) {
        const serverDelay = readRetryAfterMs(error)
        const delay =
          serverDelay !== null
            ? serverDelay
            : random() * (options.baseDelayMs * 2 ** (attempt - 1))
        await sleep(delay)
      }
    }
  }
  throw lastError
}
