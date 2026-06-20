import { describe, it, expect } from 'vitest'
import { RateLimiter } from '../src/RateLimiter.js'

function makeClock(start = 1_000_000): { now: () => number; advance: (ms: number) => void; set: (t: number) => void } {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => { t += ms },
    set: (next: number) => { t = next },
  }
}

describe('RateLimiter — fixed mode', () => {
  it('allows up to max within a window and blocks the next call', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed', now: clock.now })

    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('user-1')).toBe(true)
    }
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('resets capacity at the next window boundary', () => {
    const clock = makeClock(1_000_000)
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed', now: clock.now })

    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(false)

    // jump into the next discrete window
    clock.set(1_001_000)
    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(false)
  })

  it('tracks multiple keys independently', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed', now: clock.now })

    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('b')).toBe(true)
    expect(limiter.allow('a')).toBe(false)
    expect(limiter.allow('b')).toBe(false)
  })

  it('does NOT reset purely on elapsed-time since first call (window-aligned semantics)', () => {
    // Pick a start near a window boundary to verify discrete-window behavior.
    const clock = makeClock(999) // window [0, 1000)
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed', now: clock.now })

    expect(limiter.allow('k')).toBe(true) // first call at t=999, in window [0, 1000)
    clock.set(1000) // next window starts
    expect(limiter.allow('k')).toBe(true) // new window allows again
    expect(limiter.allow('k')).toBe(false)
  })
})

describe('RateLimiter — sliding mode', () => {
  it('allows up to max in trailing window and blocks excess', () => {
    const clock = makeClock(0)
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding', now: clock.now })

    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('u')).toBe(true)
    }
    clock.set(500)
    expect(limiter.allow('u')).toBe(false)
  })

  it('allows once the oldest call ages out', () => {
    const clock = makeClock(0)
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'sliding', now: clock.now })

    for (let i = 0; i < 5; i++) {
      expect(limiter.allow('u')).toBe(true) // t=0
    }
    clock.set(500)
    expect(limiter.allow('u')).toBe(false)
    clock.set(1100) // first call at t=0 has aged out (cutoff = 100)
    expect(limiter.allow('u')).toBe(true)
  })

  it('tracks multiple keys independently', () => {
    const clock = makeClock(0)
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'sliding', now: clock.now })

    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('b')).toBe(true)
    expect(limiter.allow('a')).toBe(false)
    expect(limiter.allow('b')).toBe(false)
  })

  it('only ages out calls that are strictly older than windowMs', () => {
    const clock = makeClock(0)
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding', now: clock.now })

    expect(limiter.allow('k')).toBe(true) // t=0
    clock.set(500)
    expect(limiter.allow('k')).toBe(true) // t=500
    clock.set(1000) // cutoff = 0; t=0 is not strictly newer than cutoff
    expect(limiter.allow('k')).toBe(true) // t=0 ages out; now have [500, 1000]
    clock.set(1499)
    expect(limiter.allow('k')).toBe(false) // still 2 in trailing 1000ms
    clock.set(1501)
    expect(limiter.allow('k')).toBe(true) // t=500 ages out
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
    const clock = makeClock(0)
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'sliding', now: clock.now })

    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(false)

    limiter.reset('k')
    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(false)
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

  it('is a no-op for an unknown key', () => {
    const clock = makeClock()
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed', now: clock.now })

    expect(() => limiter.reset('never-seen')).not.toThrow()
    expect(limiter.allow('never-seen')).toBe(true)
  })
})

describe('RateLimiter — construction', () => {
  it('defaults to Date.now when no clock is provided', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('k')).toBe(true)
    expect(limiter.allow('k')).toBe(false)
  })
})
