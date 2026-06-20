import { describe, it, expect, vi, afterEach } from 'vitest'
import { retry } from '../src/retry'

afterEach(() => {
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

  it('rejects immediately when shouldRetry returns false', async () => {
    let calls = 0
    const err = new Error('bad input')
    await expect(
      retry(
        async () => {
          calls++
          throw err
        },
        { maxAttempts: 3, baseDelayMs: 100, shouldRetry: () => false },
      ),
    ).rejects.toBe(err)
    expect(calls).toBe(1)
  })

  it('retries until fn succeeds', async () => {
    let calls = 0
    const result = await retry(
      async () => {
        calls++
        if (calls < 3) throw new Error('flaky')
        return 'ok'
      },
      { maxAttempts: 5, baseDelayMs: 0, shouldRetry: () => true },
    )
    expect(result).toBe('ok')
    expect(calls).toBe(3)
  })

  it('waits between retries with exponentially growing delays', async () => {
    const delays: number[] = []
    vi.spyOn(global, 'setTimeout').mockImplementation(((
      cb: () => void,
      ms?: number,
    ) => {
      delays.push(ms ?? 0)
      cb()
      return 0 as unknown as ReturnType<typeof setTimeout>
    }) as typeof setTimeout)

    let calls = 0
    await retry(
      async () => {
        calls++
        if (calls < 4) throw new Error('flaky')
        return 'ok'
      },
      { maxAttempts: 5, baseDelayMs: 100, shouldRetry: () => true },
    )

    expect(delays.length).toBe(3)
    expect(delays[0]).toBeGreaterThanOrEqual(100)
    expect(delays[1]).toBeGreaterThan(delays[0])
    expect(delays[2]).toBeGreaterThan(delays[1])
  })

  it('applies jitter so identical retries produce different delays', async () => {
    const captureDelays = async (randomValue: number): Promise<number[]> => {
      vi.spyOn(Math, 'random').mockReturnValue(randomValue)
      const delays: number[] = []
      vi.spyOn(global, 'setTimeout').mockImplementation(((
        cb: () => void,
        ms?: number,
      ) => {
        delays.push(ms ?? 0)
        cb()
        return 0 as unknown as ReturnType<typeof setTimeout>
      }) as typeof setTimeout)
      let calls = 0
      await retry(
        async () => {
          calls++
          if (calls < 2) throw new Error('flaky')
          return 'ok'
        },
        { maxAttempts: 3, baseDelayMs: 100, shouldRetry: () => true },
      )
      vi.restoreAllMocks()
      return delays
    }

    const low = await captureDelays(0)
    const high = await captureDelays(0.9)
    expect(low[0]).not.toBe(high[0])
  })

  it('uses error.retryAfterMs as the delay when it is a finite non-negative number', async () => {
    const delays: number[] = []
    vi.spyOn(global, 'setTimeout').mockImplementation(((
      cb: () => void,
      ms?: number,
    ) => {
      delays.push(ms ?? 0)
      cb()
      return 0 as unknown as ReturnType<typeof setTimeout>
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
      { maxAttempts: 5, baseDelayMs: 100, shouldRetry: () => true },
    )

    expect(result).toBe('ok')
    expect(delays).toEqual([250, 250])
  })

  it('propagates the final error after exhausting maxAttempts', async () => {
    let calls = 0
    const errors = [new Error('e1'), new Error('e2'), new Error('e3')]
    await expect(
      retry(
        async () => {
          throw errors[calls++]
        },
        { maxAttempts: 3, baseDelayMs: 0, shouldRetry: () => true },
      ),
    ).rejects.toBe(errors[2])
    expect(calls).toBe(3)
  })
})
