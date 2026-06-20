import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { RateLimiter } from '../src/rate-limiter'

describe('RateLimiter', () => {
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

  it('fixed mode: allows up to max in a window then denies', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed' })
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('user-1')).toBe(true)
    }
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('fixed mode: capacity resets after the window ends', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    vi.setSystemTime(1000)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('tracks keys independently', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    expect(limiter.allow('user-2')).toBe(true)
    expect(limiter.allow('user-2')).toBe(true)
    expect(limiter.allow('user-2')).toBe(false)
  })

  it('sliding mode: denies the 6th call within the trailing window', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('user-1')).toBe(true)
    }
    vi.setSystemTime(500)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('sliding mode: denies across fixed-window boundary while calls are still in trailing window', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
    vi.setSystemTime(950)
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('user-1')).toBe(true)
    }
    vi.setSystemTime(1100)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('sliding mode: allows after oldest call ages out', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('user-1')).toBe(true)
    }
    vi.setSystemTime(1100)
    expect(limiter.allow('user-1')).toBe(true)
  })

  it('sliding mode: tracks keys independently', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    expect(limiter.allow('user-2')).toBe(true)
    expect(limiter.allow('user-2')).toBe(true)
    expect(limiter.allow('user-2')).toBe(false)
  })

  it('reset: restores full capacity for a key in fixed mode', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    limiter.reset('user-1')
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('reset: restores full capacity for a key in sliding mode', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    limiter.reset('user-1')
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('reset: only affects the named key', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    limiter.allow('user-1')
    limiter.allow('user-1')
    limiter.allow('user-2')
    limiter.reset('user-1')
    expect(limiter.allow('user-2')).toBe(true)
    expect(limiter.allow('user-2')).toBe(false)
  })

  it('reset: is a no-op for an unseen key', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    expect(() => limiter.reset('unknown')).not.toThrow()
    expect(limiter.allow('unknown')).toBe(true)
    expect(limiter.allow('unknown')).toBe(true)
    expect(limiter.allow('unknown')).toBe(false)
  })
})
