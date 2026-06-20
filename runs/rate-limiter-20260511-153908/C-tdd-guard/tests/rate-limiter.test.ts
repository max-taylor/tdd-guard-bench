import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimiter } from '../src/rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
  })

  it('blocks the request after max in fixed mode', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed' })
    for (let i = 0; i < 5; i++) limiter.allow('user-1')
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('honors a configurable max value', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('tracks each key independently', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    limiter.allow('user-1')
    limiter.allow('user-1')
    expect(limiter.allow('user-1')).toBe(false)
    expect(limiter.allow('user-2')).toBe(true)
  })

  it('resets the count when the fixed window ends', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    limiter.allow('user-1')
    limiter.allow('user-1')
    expect(limiter.allow('user-1')).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(limiter.allow('user-1')).toBe(true)
  })

  it('blocks subsequent calls in sliding mode within the trailing window', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
    for (let i = 0; i < 5; i++) limiter.allow('user-1')
    vi.advanceTimersByTime(500)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('blocks in sliding mode across a fixed-window boundary when calls have not aged out', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
    vi.advanceTimersByTime(500)
    for (let i = 0; i < 5; i++) limiter.allow('user-1')
    vi.advanceTimersByTime(500)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('allows again in sliding mode once the oldest call ages out', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
    for (let i = 0; i < 5; i++) limiter.allow('user-1')
    vi.advanceTimersByTime(1100)
    expect(limiter.allow('user-1')).toBe(true)
  })

  describe('reset', () => {
    it('restores full capacity for a key in fixed mode', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      limiter.allow('user-1')
      limiter.allow('user-1')
      expect(limiter.allow('user-1')).toBe(false)
      limiter.reset('user-1')
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-1')).toBe(false)
    })

    it('restores full capacity for a key in sliding mode', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding' })
      limiter.allow('user-1')
      limiter.allow('user-1')
      expect(limiter.allow('user-1')).toBe(false)
      limiter.reset('user-1')
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-1')).toBe(false)
    })

    it('only affects the named key', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      limiter.allow('user-1')
      limiter.allow('user-1')
      limiter.allow('user-2')
      limiter.allow('user-2')
      limiter.reset('user-1')
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-2')).toBe(false)
    })

    it('is a no-op for an unknown key', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      expect(() => limiter.reset('never-seen')).not.toThrow()
      expect(limiter.allow('never-seen')).toBe(true)
    })
  })
})
