import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimiter } from '../src/rate-limiter'

describe('RateLimiter (fixed mode)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
  })

  it('allows up to max requests, then denies', () => {
    const limiter = new RateLimiter({ max: 3, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('resets capacity at the start of the next window', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    vi.setSystemTime(1000)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('tracks separate counts per key', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-2')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    expect(limiter.allow('user-2')).toBe(false)
  })
})

describe('RateLimiter (sliding mode)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows up to max requests in the trailing window, then denies', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('user-1')).toBe(true)
    }
    vi.setSystemTime(500)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('denies after a fixed-window boundary if old requests are still in the trailing window', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding' })
    vi.setSystemTime(500)
    expect(limiter.allow('user-1')).toBe(true)
    vi.setSystemTime(999)
    expect(limiter.allow('user-1')).toBe(true)
    vi.setSystemTime(1000)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('admits a new request once the oldest one ages out', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('user-1')).toBe(true)
    }
    vi.setSystemTime(500)
    expect(limiter.allow('user-1')).toBe(false)
    vi.setSystemTime(1100)
    expect(limiter.allow('user-1')).toBe(true)
  })

  it('tracks keys independently in sliding mode', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'sliding' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-2')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    expect(limiter.allow('user-2')).toBe(false)
  })
})

describe('RateLimiter.reset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restores full capacity for a key in fixed mode', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    limiter.reset('user-1')
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('restores full capacity for a key in sliding mode', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    limiter.reset('user-1')
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('only affects the named key', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-2')).toBe(true)
    limiter.reset('user-1')
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-2')).toBe(false)
  })

  it('is a no-op for an unknown key', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed' })
    expect(() => limiter.reset('never-seen')).not.toThrow()
    expect(limiter.allow('never-seen')).toBe(true)
  })
})
