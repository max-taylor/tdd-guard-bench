export type RetryOptions = {
  maxAttempts: number
  baseDelayMs: number
  shouldRetry: (error: unknown) => boolean
  sleep?: (ms: number) => Promise<void>
  random?: () => number
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

function getRetryAfterMs(error: unknown): number | undefined {
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
  const { maxAttempts, baseDelayMs, shouldRetry } = options
  const sleep = options.sleep ?? defaultSleep
  const random = options.random ?? Math.random

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!shouldRetry(error)) throw error
      if (attempt === maxAttempts) throw error

      const serverDelay = getRetryAfterMs(error)
      if (serverDelay !== undefined) {
        await sleep(serverDelay)
      } else {
        const exponential = baseDelayMs * 2 ** (attempt - 1)
        const jittered = exponential * (0.5 + random() * 0.5)
        await sleep(jittered)
      }
    }
  }
  throw lastError
}
