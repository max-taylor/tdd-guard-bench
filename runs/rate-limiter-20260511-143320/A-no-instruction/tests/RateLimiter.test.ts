import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimiter } from '../src/RateLimiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('fixed mode', () => {
    it('allows up to max requests within a window', () => {
      const rl = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed' })
      for (let i = 0; i < 5; i++) {
        expect(rl.allow('user-1')).toBe(true)
      }
      expect(rl.allow('user-1')).toBe(false)
    })

    it('resets capacity at the next window boundary', () => {
      const rl = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      expect(rl.allow('user-1')).toBe(true)
      expect(rl.allow('user-1')).toBe(true)
      expect(rl.allow('user-1')).toBe(false)

      vi.setSystemTime(1000)
      expect(rl.allow('user-1')).toBe(true)
      expect(rl.allow('user-1')).toBe(true)
      expect(rl.allow('user-1')).toBe(false)
    })

    it('tracks keys independently', () => {
      const rl = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed' })
      expect(rl.allow('a')).toBe(true)
      expect(rl.allow('b')).toBe(true)
      expect(rl.allow('a')).toBe(false)
      expect(rl.allow('b')).toBe(false)
    })

    it('does not reset mid-window even after partial elapse', () => {
      const rl = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
      expect(rl.allow('u')).toBe(true)
      expect(rl.allow('u')).toBe(true)
      vi.setSystemTime(500)
      expect(rl.allow('u')).toBe(false)
      vi.setSystemTime(999)
      expect(rl.allow('u')).toBe(false)
      vi.setSystemTime(1000)
      expect(rl.allow('u')).toBe(true)
    })
  })

  describe('sliding mode', () => {
    it('allows up to max requests within the trailing window', () => {
      const rl = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
      for (let i = 0; i < 5; i++) {
        expect(rl.allow('user-1')).toBe(true)
      }
      expect(rl.allow('user-1')).toBe(false)
    })

    it('blocks mid-window when at capacity', () => {
      const rl = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
      for (let i = 0; i < 5; i++) {
        expect(rl.allow('user-1')).toBe(true)
      }
      vi.setSystemTime(500)
      expect(rl.allow('user-1')).toBe(false)
    })

    it('allows again once an old request ages out', () => {
      const rl = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding' })
      for (let i = 0; i < 5; i++) {
        expect(rl.allow('user-1')).toBe(true)
      }
      vi.setSystemTime(1100)
      expect(rl.allow('user-1')).toBe(true)
    })

    it('tracks keys independently', () => {
      const rl = new RateLimiter({ max: 1, windowMs: 1000, mode: 'sliding' })
      expect(rl.allow('a')).toBe(true)
      expect(rl.allow('b')).toBe(true)
      expect(rl.allow('a')).toBe(false)
      expect(rl.allow('b')).toBe(false)
    })

    it('treats the window as a half-open trailing interval', () => {
      const rl = new RateLimiter({ max: 1, windowMs: 1000, mode: 'sliding' })
      expect(rl.allow('u')).toBe(true)
      vi.setSystemTime(999)
      expect(rl.allow('u')).toBe(false)
      vi.setSystemTime(1000)
      expect(rl.allow('u')).toBe(true)
    })
  })
})
