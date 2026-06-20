import { describe, it, expect } from 'vitest'
import { RateLimiter } from '../src/rate-limiter'

describe('RateLimiter', () => {
  describe('fixed mode', () => {
    it('allows a request when under the max', () => {
      const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed' })
      expect(limiter.allow('user-1')).toBe(true)
    })

    it('denies the request after max requests in the same window', () => {
      const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed' })
      for (let i = 0; i < 5; i++) limiter.allow('user-1')
      expect(limiter.allow('user-1')).toBe(false)
    })

    it('tracks separate keys independently', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      limiter.allow('a')
      limiter.allow('a')
      expect(limiter.allow('a')).toBe(false)
      expect(limiter.allow('b')).toBe(true)
    })

    it('resets capacity at the next window boundary', () => {
      let now = 0
      const limiter = new RateLimiter({
        max: 2,
        windowMs: 1000,
        mode: 'fixed',
        now: () => now,
      })
      limiter.allow('a')
      limiter.allow('a')
      expect(limiter.allow('a')).toBe(false)
      now = 1000
      expect(limiter.allow('a')).toBe(true)
    })
  })

  describe('sliding mode', () => {
    it('denies a call when prior requests still fall in the trailing window', () => {
      let now = 999
      const limiter = new RateLimiter({
        max: 5,
        windowMs: 1000,
        mode: 'sliding',
        now: () => now,
      })
      for (let i = 0; i < 5; i++) limiter.allow('a')
      now = 1500
      expect(limiter.allow('a')).toBe(false)
    })

    it('allows a call once the oldest request ages out', () => {
      let now = 0
      const limiter = new RateLimiter({
        max: 5,
        windowMs: 1000,
        mode: 'sliding',
        now: () => now,
      })
      for (let i = 0; i < 5; i++) limiter.allow('a')
      now = 500
      expect(limiter.allow('a')).toBe(false)
      now = 1100
      expect(limiter.allow('a')).toBe(true)
    })

    it('tracks separate keys independently in sliding mode', () => {
      const limiter = new RateLimiter({
        max: 2,
        windowMs: 1000,
        mode: 'sliding',
      })
      limiter.allow('a')
      limiter.allow('a')
      expect(limiter.allow('a')).toBe(false)
      expect(limiter.allow('b')).toBe(true)
    })
  })

  describe('reset', () => {
    it('restores full capacity for the key in fixed mode', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      limiter.allow('user-1')
      limiter.allow('user-1')
      expect(limiter.allow('user-1')).toBe(false)
      limiter.reset('user-1')
      expect(limiter.allow('user-1')).toBe(true)
    })

    it('restores full capacity for the key in sliding mode', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding' })
      limiter.allow('user-1')
      limiter.allow('user-1')
      expect(limiter.allow('user-1')).toBe(false)
      limiter.reset('user-1')
      expect(limiter.allow('user-1')).toBe(true)
    })

    it('does not affect other keys', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      limiter.allow('a')
      limiter.allow('a')
      limiter.allow('b')
      limiter.reset('a')
      expect(limiter.allow('b')).toBe(true)
      expect(limiter.allow('b')).toBe(false)
    })

    it('is a no-op for an unseen key', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      expect(() => limiter.reset('never-seen')).not.toThrow()
    })
  })
})
