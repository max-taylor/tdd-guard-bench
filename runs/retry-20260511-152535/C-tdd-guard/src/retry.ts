export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  shouldRetry: (error: unknown) => boolean
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= options.maxAttempts) break
      if (!options.shouldRetry(error)) throw error
      const serverDelay = serverSuppliedDelay(error)
      await sleep(serverDelay ?? computeDelay(attempt, options.baseDelayMs))
    }
  }
  throw lastError
}

function serverSuppliedDelay(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null
  const value = (error as { retryAfterMs?: unknown }).retryAfterMs
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    return null
  return value
}

function computeDelay(attempt: number, baseDelayMs: number): number {
  const exp = baseDelayMs * 2 ** (attempt - 1)
  const jitter = Math.random() * exp
  return exp + jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
