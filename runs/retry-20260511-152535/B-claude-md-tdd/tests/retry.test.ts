import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { retry } from '../src/retry'

describe('retry', () => {
  it('resolves with fn result on first successful attempt', async () => {
    const result = await retry(async () => 'ok', {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
    })
    expect(result).toBe('ok')
  })

  it('rejects immediately when shouldRetry returns false', async () => {
    let calls = 0
    const err = new Error('non-retryable')
    await expect(
      retry(
        async () => {
          calls++
          throw err
        },
        {
          maxAttempts: 5,
          baseDelayMs: 100,
          shouldRetry: () => false,
        }
      )
    ).rejects.toBe(err)
    expect(calls).toBe(1)
  })

  it('retries and resolves when fn eventually succeeds', async () => {
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

  it('stops after maxAttempts and propagates the final error', async () => {
    let calls = 0
    const err = new Error('always fails')
    await expect(
      retry(
        async () => {
          calls++
          throw err
        },
        {
          maxAttempts: 3,
          baseDelayMs: 0,
          shouldRetry: () => true,
        }
      )
    ).rejects.toBe(err)
    expect(calls).toBe(3)
  })

  describe('with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('waits before retrying a failed attempt', async () => {
      let calls = 0
      const promise = retry(
        async () => {
          calls++
          if (calls < 2) throw new Error('flaky')
          return 'ok'
        },
        { maxAttempts: 3, baseDelayMs: 100, shouldRetry: () => true }
      )

      // Let the first failing attempt run.
      await vi.advanceTimersByTimeAsync(0)
      expect(calls).toBe(1)

      // Without advancing time, the second attempt should not yet run.
      await Promise.resolve()
      await Promise.resolve()
      expect(calls).toBe(1)

      // After advancing past the delay, the retry runs and resolves.
      await vi.advanceTimersByTimeAsync(1000)
      await expect(promise).resolves.toBe('ok')
      expect(calls).toBe(2)
    })

    it('uses exponentially growing delays between retries', async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
      const promise = retry(
        async () => {
          throw new Error('always fails')
        },
        { maxAttempts: 4, baseDelayMs: 100, shouldRetry: () => true }
      )
      promise.catch(() => {}) // prevent unhandled rejection
      await vi.runAllTimersAsync()
      await expect(promise).rejects.toThrow('always fails')

      const delays = setTimeoutSpy.mock.calls.map((c) => c[1] as number)
      expect(delays.length).toBe(3)
      expect(delays[1]).toBeGreaterThan(delays[0])
      expect(delays[2]).toBeGreaterThan(delays[1])
    })

    it('uses error.retryAfterMs as the delay when present and valid', async () => {
      class ThrottledError extends Error {
        retryAfterMs = 250
      }
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
      let calls = 0
      const promise = retry(
        async () => {
          calls++
          if (calls < 3) throw new ThrottledError('slow down')
          return 'ok'
        },
        { maxAttempts: 5, baseDelayMs: 100, shouldRetry: () => true }
      )
      await vi.runAllTimersAsync()
      await expect(promise).resolves.toBe('ok')
      const delays = setTimeoutSpy.mock.calls.map((c) => c[1] as number)
      expect(delays).toEqual([250, 250])
      setTimeoutSpy.mockRestore()
    })

    it('applies jitter so delays vary with randomness', async () => {
      async function collectDelays(randomValue: number): Promise<number[]> {
        const randomSpy = vi
          .spyOn(Math, 'random')
          .mockReturnValue(randomValue)
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
        const p = retry(
          async () => {
            throw new Error('fail')
          },
          { maxAttempts: 3, baseDelayMs: 100, shouldRetry: () => true }
        )
        p.catch(() => {})
        await vi.runAllTimersAsync()
        await p.catch(() => {})
        const delays = setTimeoutSpy.mock.calls.map((c) => c[1] as number)
        randomSpy.mockRestore()
        setTimeoutSpy.mockRestore()
        return delays
      }

      const delaysA = await collectDelays(0)
      const delaysB = await collectDelays(0.99)
      expect(delaysA).not.toEqual(delaysB)
    })
  })
})
