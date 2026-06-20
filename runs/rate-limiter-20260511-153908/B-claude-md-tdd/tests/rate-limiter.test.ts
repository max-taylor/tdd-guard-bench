import { describe, it, expect } from 'vitest'
import { RateLimiter } from '../src/rate-limiter'

describe('RateLimiter', () => {
  describe('fixed mode', () => {
    it('allows the first request for a key', () => {
      const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed' })
      expect(limiter.allow('user-1')).toBe(true)
    })

    it('rejects requests beyond max within the same window', () => {
      const limiter = new RateLimiter({ max: 3, windowMs: 1000, mode: 'fixed' })
      expect(limiter.allow('user-1')).toBe(true)
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

    it('resets capacity when a new window begins', () => {
      let now = 0
      const limiter = new RateLimiter({
        max: 2,
        windowMs: 1000,
        mode: 'fixed',
        now: () => now,
      })
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-1')).toBe(false)
      now = 1000
      expect(limiter.allow('user-1')).toBe(true)
    })
  })

  describe('sliding mode', () => {
    it('rejects requests still inside the trailing window even after a fixed boundary would reset', () => {
      let now = 999
      const limiter = new RateLimiter({
        max: 5,
        windowMs: 1000,
        mode: 'sliding',
        now: () => now,
      })
      for (let i = 0; i < 5; i++) {
        expect(limiter.allow('user-1')).toBe(true)
      }
      now = 1100
      expect(limiter.allow('user-1')).toBe(false)
    })

    it('allows a request once the oldest call has aged out', () => {
      let now = 0
      const limiter = new RateLimiter({
        max: 5,
        windowMs: 1000,
        mode: 'sliding',
        now: () => now,
      })
      for (let i = 0; i < 5; i++) {
        expect(limiter.allow('user-1')).toBe(true)
      }
      now = 500
      expect(limiter.allow('user-1')).toBe(false)
      now = 1100
      expect(limiter.allow('user-1')).toBe(true)
    })

    it('tracks separate trailing windows per key', () => {
      const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'sliding' })
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-2')).toBe(true)
      expect(limiter.allow('user-1')).toBe(false)
      expect(limiter.allow('user-2')).toBe(false)
    })
  })

  describe('reset', () => {
    it('restores full capacity for a key in fixed mode', () => {
      const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-1')).toBe(true)
      expect(limiter.allow('user-1')).toBe(false)
      limiter.reset('user-1')
      expect(limiter.allow('user-1')).toBe(true)
    })
  })
})
