import { describe, it, expect, vi, afterEach } from 'vitest'
import { retry } from '../src/retry'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('retry', () => {
  it('resolves with the value when fn succeeds on first attempt', async () => {
    const result = await retry(async () => 'ok', {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
    })
    expect(result).toBe('ok')
  })

  it('propagates the error immediately when shouldRetry returns false', async () => {
    let calls = 0
    const error = new Error('non-retryable')
    await expect(
      retry(
        async () => {
          calls++
          throw error
        },
        {
          maxAttempts: 5,
          baseDelayMs: 100,
          shouldRetry: () => false,
        }
      )
    ).rejects.toBe(error)
    expect(calls).toBe(1)
  })

  it('retries until fn succeeds when shouldRetry returns true', async () => {
    let calls = 0
    const result = await retry(
      async () => {
        calls++
        if (calls < 3) throw new Error('flaky')
        return 'ok'
      },
      {
        maxAttempts: 5,
        baseDelayMs: 0,
        shouldRetry: () => true,
      }
    )
    expect(result).toBe('ok')
    expect(calls).toBe(3)
  })

  it('stops after maxAttempts invocations and propagates the final error', async () => {
    let calls = 0
    const errors = [new Error('a'), new Error('b'), new Error('c')]
    await expect(
      retry(
        async () => {
          const error = errors[calls]
          calls++
          throw error
        },
        {
          maxAttempts: 3,
          baseDelayMs: 0,
          shouldRetry: () => true,
        }
      )
    ).rejects.toBe(errors[2])
    expect(calls).toBe(3)
  })

  it('waits between failed attempts before retrying', async () => {
    vi.useFakeTimers()
    let calls = 0
    const promise = retry(
      async () => {
        calls++
        throw new Error('fail')
      },
      {
        maxAttempts: 2,
        baseDelayMs: 100,
        shouldRetry: () => true,
      }
    )
    promise.catch(() => {})
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toBe(1)
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(1000)
    await expect(promise).rejects.toThrow('fail')
    expect(calls).toBe(2)
  })

  it('uses exponential backoff so delays grow with each retry', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const promise = retry(
      async () => {
        throw new Error('fail')
      },
      {
        maxAttempts: 4,
        baseDelayMs: 100,
        shouldRetry: () => true,
      }
    )
    promise.catch(() => {})
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow('fail')
    const delays = setTimeoutSpy.mock.calls.map((c) => c[1] as number)
    expect(delays).toEqual([100, 200, 400])
  })

  it('uses error.retryAfterMs as the delay when it is a finite non-negative number', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    class ThrottledError extends Error {
      retryAfterMs = 250
    }
    const promise = retry(
      async () => {
        throw new ThrottledError('slow down')
      },
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: () => true,
      }
    )
    promise.catch(() => {})
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow('slow down')
    const delays = setTimeoutSpy.mock.calls.map((c) => c[1] as number)
    expect(delays).toEqual([250, 250])
  })

  it('applies jitter so equal exponential bases produce different delays', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.25).mockReturnValueOnce(0.75)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const promise = retry(
      async () => {
        throw new Error('fail')
      },
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: () => true,
      }
    )
    promise.catch(() => {})
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow('fail')
    const delays = setTimeoutSpy.mock.calls.map((c) => c[1] as number)
    expect(delays).toHaveLength(2)
    expect(delays[0]).not.toBe(delays[1])
    expect(delays[0]).toBeGreaterThan(100)
    expect(delays[1]).toBeGreaterThan(200)
  })
})
