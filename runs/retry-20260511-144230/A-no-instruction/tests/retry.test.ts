import { describe, it, expect, vi } from 'vitest'
import { retry, computeDelay } from '../src/retry.js'

class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

const noSleep = () => Promise.resolve()
const noJitter = () => 0

describe('retry', () => {
  it('returns the resolved value on first attempt', async () => {
    const fn = vi.fn(async () => 'ok')
    const result = await retry(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep: noSleep,
      random: noJitter,
    })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not call sleep when the first attempt succeeds', async () => {
    const sleep = vi.fn(() => Promise.resolve())
    await retry(async () => 1, {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep,
      random: noJitter,
    })
    expect(sleep).not.toHaveBeenCalled()
  })

  it('retries on retryable failure and resolves once fn succeeds', async () => {
    let calls = 0
    const result = await retry(
      async () => {
        calls++
        if (calls < 3) throw new Error('flaky')
        return 'ok'
      },
      {
        maxAttempts: 5,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep: noSleep,
        random: noJitter,
      }
    )
    expect(result).toBe('ok')
    expect(calls).toBe(3)
  })

  it('propagates immediately when shouldRetry returns false', async () => {
    const error = new ValidationError('bad input')
    const fn = vi.fn(async () => {
      throw error
    })
    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: (e) => !(e instanceof ValidationError),
        sleep: noSleep,
        random: noJitter,
      })
    ).rejects.toBe(error)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes the thrown error to shouldRetry', async () => {
    const error = new Error('boom')
    const shouldRetry = vi.fn(() => false)
    await expect(
      retry(
        async () => {
          throw error
        },
        {
          maxAttempts: 3,
          baseDelayMs: 100,
          shouldRetry,
          sleep: noSleep,
          random: noJitter,
        }
      )
    ).rejects.toBe(error)
    expect(shouldRetry).toHaveBeenCalledWith(error)
  })

  it('propagates the final error after exhausting maxAttempts', async () => {
    let calls = 0
    let lastError: Error | undefined
    let caught: unknown
    try {
      await retry(
        async () => {
          calls++
          lastError = new Error(`attempt ${calls}`)
          throw lastError
        },
        {
          maxAttempts: 3,
          baseDelayMs: 100,
          shouldRetry: () => true,
          sleep: noSleep,
          random: noJitter,
        }
      )
    } catch (e) {
      caught = e
    }
    expect(caught).toBe(lastError)
    expect(calls).toBe(3)
  })

  it('invokes fn exactly maxAttempts times when all attempts fail', async () => {
    const fn = vi.fn(async () => {
      throw new Error('nope')
    })
    await expect(
      retry(fn, {
        maxAttempts: 4,
        baseDelayMs: 50,
        shouldRetry: () => true,
        sleep: noSleep,
        random: noJitter,
      })
    ).rejects.toThrow('nope')
    expect(fn).toHaveBeenCalledTimes(4)
  })

  it('uses exponential backoff between retries', async () => {
    const sleep = vi.fn((_ms: number) => Promise.resolve())
    await expect(
      retry(
        async () => {
          throw new Error('fail')
        },
        {
          maxAttempts: 4,
          baseDelayMs: 100,
          shouldRetry: () => true,
          sleep,
          random: noJitter,
        }
      )
    ).rejects.toThrow('fail')
    expect(sleep).toHaveBeenCalledTimes(3)
    const delays = sleep.mock.calls.map((c) => c[0] as number)
    expect(delays[1]).toBeGreaterThan(delays[0])
    expect(delays[2]).toBeGreaterThan(delays[1])
  })

  it('does not sleep after the final failed attempt', async () => {
    const sleep = vi.fn(() => Promise.resolve())
    await expect(
      retry(
        async () => {
          throw new Error('fail')
        },
        {
          maxAttempts: 2,
          baseDelayMs: 100,
          shouldRetry: () => true,
          sleep,
          random: noJitter,
        }
      )
    ).rejects.toThrow('fail')
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('applies jitter so two callers with the same seed differ when random differs', async () => {
    const sleepA = vi.fn((_ms: number) => Promise.resolve())
    const sleepB = vi.fn((_ms: number) => Promise.resolve())
    const failOnce = async () => {
      throw new Error('fail')
    }
    await expect(
      retry(failOnce, {
        maxAttempts: 2,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep: sleepA,
        random: () => 0,
      })
    ).rejects.toThrow()
    await expect(
      retry(failOnce, {
        maxAttempts: 2,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep: sleepB,
        random: () => 0.9,
      })
    ).rejects.toThrow()
    expect(sleepA.mock.calls[0][0]).not.toBe(sleepB.mock.calls[0][0])
  })
})

describe('computeDelay', () => {
  it('grows exponentially based on the attempt number', () => {
    expect(computeDelay(1, 100, () => 0)).toBe(100)
    expect(computeDelay(2, 100, () => 0)).toBe(200)
    expect(computeDelay(3, 100, () => 0)).toBe(400)
  })

  it('adds jitter on top of the exponential base', () => {
    const withJitter = computeDelay(1, 100, () => 0.5)
    expect(withJitter).toBeGreaterThan(100)
  })
})
