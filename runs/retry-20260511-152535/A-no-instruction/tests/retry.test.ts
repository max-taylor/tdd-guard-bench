import { describe, expect, it, vi } from 'vitest'
import { retry } from '../src/retry.js'

function makeSleep() {
  const delays: number[] = []
  const sleep = (ms: number) => {
    delays.push(ms)
    return Promise.resolve()
  }
  return { delays, sleep }
}

describe('retry', () => {
  it('resolves with the value when fn succeeds on first attempt', async () => {
    const { delays, sleep } = makeSleep()
    const fn = vi.fn().mockResolvedValue('value')

    const result = await retry(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep,
    })

    expect(result).toBe('value')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(delays).toEqual([])
  })

  it('retries until success and returns the resolved value', async () => {
    const { sleep } = makeSleep()
    let calls = 0
    const fn = async () => {
      calls++
      if (calls < 3) throw new Error('flaky')
      return 'ok'
    }

    const result = await retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep,
      random: () => 0.5,
    })

    expect(result).toBe('ok')
    expect(calls).toBe(3)
  })

  it('propagates non-retryable errors immediately without retrying', async () => {
    class ValidationError extends Error {}
    const { delays, sleep } = makeSleep()
    const fn = vi.fn(async () => {
      throw new ValidationError('bad input')
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: (e) => !(e instanceof ValidationError),
        sleep,
      })
    ).rejects.toBeInstanceOf(ValidationError)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(delays).toEqual([])
  })

  it('propagates the final error after exhausting maxAttempts', async () => {
    const { sleep } = makeSleep()
    const err = new Error('still failing')
    const fn = vi.fn(async () => {
      throw err
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 0.5,
      })
    ).rejects.toBe(err)

    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('uses exponential backoff between attempts', async () => {
    const { delays, sleep } = makeSleep()
    const fn = vi.fn(async () => {
      throw new Error('fail')
    })

    await expect(
      retry(fn, {
        maxAttempts: 4,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 1,
      })
    ).rejects.toThrow('fail')

    // With random()=1, jitter factor = 1.0, so delay = base * 2^(attempt-1)
    expect(delays).toEqual([100, 200, 400])
  })

  it('applies jitter to delays', async () => {
    const { delays, sleep } = makeSleep()
    const fn = vi.fn(async () => {
      throw new Error('fail')
    })

    await expect(
      retry(fn, {
        maxAttempts: 2,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 0,
      })
    ).rejects.toThrow('fail')

    // With random()=0, jitter factor = 0.5, so delay = base * 0.5 = 50
    expect(delays).toEqual([50])
  })

  it('does not sleep after the final failed attempt', async () => {
    const { delays, sleep } = makeSleep()
    const fn = vi.fn(async () => {
      throw new Error('fail')
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 0.5,
      })
    ).rejects.toThrow('fail')

    // 3 attempts => 2 sleeps between them
    expect(delays).toHaveLength(2)
  })

  it('uses error.retryAfterMs as the delay when present and valid', async () => {
    class ThrottledError extends Error {
      retryAfterMs = 250
    }
    const { delays, sleep } = makeSleep()
    let calls = 0
    const fn = async () => {
      calls++
      if (calls < 3) throw new ThrottledError('slow down')
      return 'ok'
    }

    const result = await retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep,
      random: () => 0.5,
    })

    expect(result).toBe('ok')
    expect(delays).toEqual([250, 250])
  })

  it('falls back to exponential backoff when retryAfterMs is missing', async () => {
    const { delays, sleep } = makeSleep()
    const fn = vi.fn(async () => {
      throw new Error('fail')
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 1,
      })
    ).rejects.toThrow('fail')

    expect(delays).toEqual([100, 200])
  })

  it('falls back to exponential backoff when retryAfterMs is invalid', async () => {
    const invalidValues = [-1, NaN, Infinity, -Infinity, 'soon', null]
    for (const value of invalidValues) {
      const { delays, sleep } = makeSleep()
      const err = Object.assign(new Error('fail'), { retryAfterMs: value })
      const fn = vi.fn(async () => {
        throw err
      })

      await expect(
        retry(fn, {
          maxAttempts: 2,
          baseDelayMs: 100,
          shouldRetry: () => true,
          sleep,
          random: () => 1,
        })
      ).rejects.toBe(err)

      expect(delays).toEqual([100])
    }
  })

  it('decides per attempt whether to use retryAfterMs', async () => {
    const { delays, sleep } = makeSleep()
    let calls = 0
    const fn = async () => {
      calls++
      if (calls === 1) throw Object.assign(new Error('throttle'), { retryAfterMs: 500 })
      if (calls === 2) throw new Error('plain')
      return 'ok'
    }

    const result = await retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep,
      random: () => 1,
    })

    expect(result).toBe('ok')
    // first delay: server-supplied 500; second delay: exponential 100 * 2^1 = 200
    expect(delays).toEqual([500, 200])
  })

  it('accepts retryAfterMs of 0', async () => {
    const { delays, sleep } = makeSleep()
    let calls = 0
    const fn = async () => {
      calls++
      if (calls < 2) throw Object.assign(new Error('retry now'), { retryAfterMs: 0 })
      return 'ok'
    }

    const result = await retry(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep,
      random: () => 1,
    })

    expect(result).toBe('ok')
    expect(delays).toEqual([0])
  })

  it('passes the thrown error to shouldRetry', async () => {
    const { sleep } = makeSleep()
    const err = new Error('boom')
    const shouldRetry = vi.fn(() => false)
    const fn = vi.fn(async () => {
      throw err
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry,
        sleep,
      })
    ).rejects.toBe(err)

    expect(shouldRetry).toHaveBeenCalledWith(err)
  })
})
