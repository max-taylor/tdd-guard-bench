import { describe, it, expect } from 'vitest'
import { RateLimiter } from '../src/RateLimiter.js'

function makeClock(start = 1_000_000) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
    set: (ms: number) => {
      t = ms
    },
  }
}

describe('RateLimiter — construction', () => {
  it('rejects non-positive max', () => {
    expect(() => new RateLimiter({ max: 0, windowMs: 1000, mode: 'fixed' })).toThrow()
    expect(() => new RateLimiter({ max: -1, windowMs: 1000, mode: 'fixed' })).toThrow()
  })

  it('rejects non-positive windowMs', () => {
    expect(() => new RateLimiter({ max: 5, windowMs: 0, mode: 'fixed' })).toThrow()
    expect(() => new RateLimiter({ max: 5, windowMs: -100, mode: 'fixed' })).toThrow()
  })

  it('rejects invalid mode', () => {
    expect(
      () => new RateLimiter({ max: 5, windowMs: 1000, mode: 'bogus' as unknown as 'fixed' }),
    ).toThrow()
  })
})

describe('RateLimiter — fixed mode', () => {
  it('allows up to max calls within a window then denies', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed', now: clock.now })

    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('user-1')).toBe(true)
    }
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('resets capacity after the window ends', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed', now: clock.now })

    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('a')).toBe(false)

    clock.advance(1000)
    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('a')).toBe(false)
  })

  it('does not reset early mid-window even if many calls come in', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 3, windowMs: 1000, mode: 'fixed', now: clock.now })

    expect(limiter.allow('k')).toBe(true)
    clock.advance(400)
    expect(limiter.allow('k')).toBe(true)
    clock.advance(400)
    expect(limiter.allow('k')).toBe(true)
    clock.advance(100) // total 900ms < 1000ms, still same window
    expect(limiter.allow('k')).toBe(false)
  })

  it('tracks keys independently', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed', now: clock.now })

    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('b')).toBe(true)
    expect(limiter.allow('a')).toBe(false)
    expect(limiter.allow('b')).toBe(false)
  })
})

describe('RateLimiter — sliding mode', () => {
  it('allows up to max calls within trailing window then denies', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding', now: clock.now })

    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('u')).toBe(true)
    }
    clock.advance(500)
    expect(limiter.allow('u')).toBe(false)
  })

  it('lets calls through as older ones age out', () => {
    const clock = makeClock(0)
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding', now: clock.now })

    // 5 calls at t=0
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('u')).toBe(true)
    }
    clock.set(500)
    expect(limiter.allow('u')).toBe(false)
    clock.set(1100)
    // first call at t=0 aged out (cutoff = 100), 5th call still in window
    expect(limiter.allow('u')).toBe(true)
  })

  it('tracks sliding keys independently', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding', now: clock.now })

    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('b')).toBe(true)
    expect(limiter.allow('a')).toBe(false)
    expect(limiter.allow('b')).toBe(true)
    expect(limiter.allow('b')).toBe(false)
  })

  it('fully restores capacity once all timestamps age out', () => {
    const clock = makeClock(0)
    const limiter = new RateLimiter({ max: 3, windowMs: 1000, mode: 'sliding', now: clock.now })

    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(false)

    clock.set(1001)
    for (let i = 0; i < 3; i++) {
      expect(limiter.allow('k')).toBe(true)
    }
    expect(limiter.allow('k')).toBe(false)
  })
})

describe('RateLimiter — reset', () => {
  it('restores full capacity for a key in fixed mode', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed', now: clock.now })

    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)

    limiter.reset('user-1')
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('restores full capacity for a key in sliding mode', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding', now: clock.now })

    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)

    limiter.reset('user-1')
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('only affects the named key', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed', now: clock.now })

    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('b')).toBe(true)
    expect(limiter.allow('a')).toBe(false)
    expect(limiter.allow('b')).toBe(false)

    limiter.reset('a')
    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('b')).toBe(false)
  })

  it('is a no-op on an unknown key', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed' })
    expect(() => limiter.reset('never-seen')).not.toThrow()
  })
})

describe('RateLimiter — default clock', () => {
  it('uses Date.now when no clock provided', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 10_000, mode: 'fixed' })
    expect(limiter.allow('x')).toBe(true)
    expect(limiter.allow('x')).toBe(false)
  })
})
