export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  shouldRetry: (error: unknown) => boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function computeDelay(baseDelayMs: number, attempt: number): number {
  const exponential = baseDelayMs * 2 ** (attempt - 1)
  const jitter = Math.random() * exponential
  return exponential + jitter
}

function retryAfterFromError(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const value = (error as { retryAfterMs?: unknown }).retryAfterMs
  if (typeof value !== 'number') return undefined
  if (!Number.isFinite(value) || value < 0) return undefined
  return value
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
      const serverDelay = retryAfterFromError(error)
      const delay =
        serverDelay !== undefined
          ? serverDelay
          : computeDelay(options.baseDelayMs, attempt)
      await sleep(delay)
    }
  }
}
