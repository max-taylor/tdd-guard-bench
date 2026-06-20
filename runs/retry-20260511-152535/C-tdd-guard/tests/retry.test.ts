import { describe, it, expect, vi, afterEach } from 'vitest'
import { retry } from '../src/retry'

describe('retry', () => {
  it('resolves with the value returned by fn on first attempt', async () => {
    const result = await retry(async () => 'ok', {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
    })
    expect(result).toBe('ok')
  })

  it('retries until fn succeeds', async () => {
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

  describe('backoff', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('waits between retries with exponentially growing delays', async () => {
      const delays: number[] = []
      vi.spyOn(global, 'setTimeout').mockImplementation(((
        cb: () => void,
        ms?: number
      ) => {
        delays.push(ms ?? 0)
        cb()
        return 0 as unknown as NodeJS.Timeout
      }) as typeof setTimeout)

      let calls = 0
      await retry(
        async () => {
          calls++
          if (calls < 4) throw new Error('flaky')
          return 'ok'
        },
        { maxAttempts: 5, baseDelayMs: 100, shouldRetry: () => true }
      )

      expect(delays).toHaveLength(3)
      expect(delays[1]).toBeGreaterThan(delays[0]!)
      expect(delays[2]).toBeGreaterThan(delays[1]!)
      expect(delays[0]).toBeGreaterThanOrEqual(100)
      expect(delays[1]).toBeGreaterThanOrEqual(200)
      expect(delays[2]).toBeGreaterThanOrEqual(400)
    })

    it('applies jitter so two runs produce different delays', async () => {
      const collect = (): number[] => {
        const delays: number[] = []
        vi.spyOn(global, 'setTimeout').mockImplementation(((
          cb: () => void,
          ms?: number
        ) => {
          delays.push(ms ?? 0)
          cb()
          return 0 as unknown as NodeJS.Timeout
        }) as typeof setTimeout)
        return delays
      }

      const runOnce = async (): Promise<number[]> => {
        const delays = collect()
        let calls = 0
        await retry(
          async () => {
            calls++
            if (calls < 4) throw new Error('flaky')
            return 'ok'
          },
          { maxAttempts: 5, baseDelayMs: 100, shouldRetry: () => true }
        )
        vi.restoreAllMocks()
        return delays
      }

      const a = await runOnce()
      const b = await runOnce()

      expect(a).not.toEqual(b)
    })
  })

  describe('server-supplied retry delay', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('uses error.retryAfterMs verbatim instead of exponential backoff', async () => {
      const delays: number[] = []
      vi.spyOn(global, 'setTimeout').mockImplementation(((
        cb: () => void,
        ms?: number
      ) => {
        delays.push(ms ?? 0)
        cb()
        return 0 as unknown as NodeJS.Timeout
      }) as typeof setTimeout)

      class ThrottledError extends Error {
        retryAfterMs = 250
      }
      let calls = 0
      const result = await retry(
        async () => {
          calls++
          if (calls < 3) throw new ThrottledError('slow down')
          return 'ok'
        },
        { maxAttempts: 5, baseDelayMs: 100, shouldRetry: () => true }
      )
      expect(result).toBe('ok')
      expect(delays).toEqual([250, 250])
    })
  })
})
