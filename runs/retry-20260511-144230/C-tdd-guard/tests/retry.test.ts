import { describe, it, expect } from 'vitest'
import { retry } from '../src/retry'

describe('retry', () => {
  it('resolves with the value when fn succeeds on first attempt', async () => {
    const result = await retry(async () => 'ok', {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
    })
    expect(result).toBe('ok')
  })

  it('waits between attempts using exponential backoff with jitter', async () => {
    const delays: number[] = []
    const sleep = async (ms: number) => {
      delays.push(ms)
    }
    let calls = 0
    await retry(
      async () => {
        calls++
        if (calls < 4) throw new Error('flaky')
        return 'ok'
      },
      {
        maxAttempts: 5,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 0.5,
      }
    )
    expect(delays).toHaveLength(3)
    expect(delays[1]).toBeGreaterThan(delays[0])
    expect(delays[2]).toBeGreaterThan(delays[1])
    expect(delays[0]).toBeGreaterThan(0)
    expect(delays[0]).toBeLessThanOrEqual(100)
    expect(delays[1]).toBeLessThanOrEqual(200)
    expect(delays[2]).toBeLessThanOrEqual(400)
  })

  it('does not sleep after the final failed attempt', async () => {
    const delays: number[] = []
    const sleep = async (ms: number) => {
      delays.push(ms)
    }
    await expect(
      retry(
        async () => {
          throw new Error('nope')
        },
        {
          maxAttempts: 3,
          baseDelayMs: 100,
          shouldRetry: () => true,
          sleep,
          random: () => 0.5,
        }
      )
    ).rejects.toThrow('nope')
    expect(delays).toHaveLength(2)
  })

  it('propagates the final error after maxAttempts is exhausted', async () => {
    let calls = 0
    await expect(
      retry(
        async () => {
          calls++
          throw new Error(`fail ${calls}`)
        },
        { maxAttempts: 3, baseDelayMs: 0, shouldRetry: () => true }
      )
    ).rejects.toThrow('fail 3')
    expect(calls).toBe(3)
  })

  it('does not retry when shouldRetry returns false', async () => {
    class ValidationError extends Error {}
    let calls = 0
    await expect(
      retry(
        async () => {
          calls++
          throw new ValidationError('bad input')
        },
        {
          maxAttempts: 3,
          baseDelayMs: 0,
          shouldRetry: (e) => !(e instanceof ValidationError),
        }
      )
    ).rejects.toBeInstanceOf(ValidationError)
    expect(calls).toBe(1)
  })

  it('retries until success when shouldRetry returns true', async () => {
    let calls = 0
    const result = await retry(
      async () => {
        calls++
        if (calls < 3) throw new Error('flaky')
        return 'ok'
      },
      { maxAttempts: 5, baseDelayMs: 0, shouldRetry: () => true }
    )
    expect(result).toBe('ok')
    expect(calls).toBe(3)
  })

  it('uses error.retryAfterMs as the delay instead of exponential backoff', async () => {
    class ThrottledError extends Error {
      retryAfterMs = 250
    }
    const delays: number[] = []
    const sleep = async (ms: number) => {
      delays.push(ms)
    }
    let calls = 0
    const result = await retry(
      async () => {
        calls++
        if (calls < 3) throw new ThrottledError('slow down')
        return 'ok'
      },
      {
        maxAttempts: 5,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 0.5,
      }
    )
    expect(result).toBe('ok')
    expect(delays).toEqual([250, 250])
  })

  it('falls back to exponential backoff per attempt when retryAfterMs is missing or invalid', async () => {
    const delays: number[] = []
    const sleep = async (ms: number) => {
      delays.push(ms)
    }
    const errors: unknown[] = [
      Object.assign(new Error('a'), { retryAfterMs: 250 }),
      new Error('b'),
      Object.assign(new Error('c'), { retryAfterMs: -1 }),
      Object.assign(new Error('d'), { retryAfterMs: 'soon' }),
      Object.assign(new Error('e'), { retryAfterMs: Infinity }),
    ]
    let calls = 0
    await expect(
      retry(
        async () => {
          throw errors[calls++]
        },
        {
          maxAttempts: 5,
          baseDelayMs: 100,
          shouldRetry: () => true,
          sleep,
          random: () => 0.5,
        }
      )
    ).rejects.toThrow('e')
    // attempt 1 (retryAfterMs=250): 250
    // attempt 2 (no retryAfterMs): 0.5 * 100 * 2^1 = 100
    // attempt 3 (retryAfterMs=-1, invalid): 0.5 * 100 * 2^2 = 200
    // attempt 4 (retryAfterMs='soon', invalid): 0.5 * 100 * 2^3 = 400
    // attempt 5 is the last attempt — no sleep
    expect(delays).toEqual([250, 100, 200, 400])
  })

  it('accepts retryAfterMs of 0', async () => {
    const delays: number[] = []
    const sleep = async (ms: number) => {
      delays.push(ms)
    }
    let calls = 0
    const result = await retry(
      async () => {
        calls++
        if (calls < 2) {
          throw Object.assign(new Error('rate'), { retryAfterMs: 0 })
        }
        return 'ok'
      },
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 0.5,
      }
    )
    expect(result).toBe('ok')
    expect(delays).toEqual([0])
  })
})
