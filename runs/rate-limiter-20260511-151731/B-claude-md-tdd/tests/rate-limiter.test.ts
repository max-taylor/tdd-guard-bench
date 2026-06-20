import { describe, it, expect } from 'vitest'
import { RateLimiter } from '../src/rate-limiter'

describe('RateLimiter', () => {
  it('allows the first request', () => {
    const limiter = new RateLimiter({ max: 5, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
  })

  it('blocks the request after max is reached in fixed mode', () => {
    const limiter = new RateLimiter({ max: 3, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('tracks independent keys separately', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-2')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    expect(limiter.allow('user-2')).toBe(false)
  })

  it('resets capacity at the start of the next fixed window', () => {
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

  it('blocks sliding mode requests once trailing window is full', () => {
    let now = 0
    const limiter = new RateLimiter({
      max: 5,
      windowMs: 1000,
      mode: 'sliding',
      now: () => now,
    })
    for (let i = 0; i < 5; i++) expect(limiter.allow('user-1')).toBe(true)
    now = 500
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('sliding mode blocks across the fixed-window boundary', () => {
    let now = 999
    const limiter = new RateLimiter({
      max: 5,
      windowMs: 1000,
      mode: 'sliding',
      now: () => now,
    })
    for (let i = 0; i < 5; i++) expect(limiter.allow('user-1')).toBe(true)
    now = 1000
    expect(limiter.allow('user-1')).toBe(false)
  })

  it('sliding mode allows once oldest request ages out', () => {
    let now = 0
    const limiter = new RateLimiter({
      max: 5,
      windowMs: 1000,
      mode: 'sliding',
      now: () => now,
    })
    for (let i = 0; i < 5; i++) expect(limiter.allow('user-1')).toBe(true)
    now = 1100
    expect(limiter.allow('user-1')).toBe(true)
  })

  it('sliding mode tracks independent keys separately', () => {
    let now = 0
    const limiter = new RateLimiter({
      max: 1,
      windowMs: 1000,
      mode: 'sliding',
      now: () => now,
    })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-2')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    expect(limiter.allow('user-2')).toBe(false)
  })

  it('reset restores full capacity for a key in fixed mode', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
    limiter.reset('user-1')
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(true)
    expect(limiter.allow('user-1')).toBe(false)
  })
})
