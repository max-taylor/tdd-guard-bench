export type RateLimiterMode = 'fixed' | 'sliding'

export interface RateLimiterOptions {
  max: number
  windowMs: number
  mode: RateLimiterMode
}

interface FixedEntry {
  windowStart: number
  count: number
}

export class RateLimiter {
  private readonly max: number
  private readonly windowMs: number
  private readonly mode: RateLimiterMode
  private readonly fixedEntries = new Map<string, FixedEntry>()
  private readonly slidingTimestamps = new Map<string, number[]>()

  constructor(options: RateLimiterOptions) {
    this.max = options.max
    this.windowMs = options.windowMs
    this.mode = options.mode
  }

  allow(key: string): boolean {
    const now = Date.now()
    if (this.mode === 'fixed') {
      return this.allowFixed(key, now)
    }
    return this.allowSliding(key, now)
  }

  reset(key: string): void {
    this.fixedEntries.delete(key)
    this.slidingTimestamps.delete(key)
  }

  private allowFixed(key: string, now: number): boolean {
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs
    const entry = this.fixedEntries.get(key)
    if (!entry || entry.windowStart !== windowStart) {
      this.fixedEntries.set(key, { windowStart, count: 1 })
      return true
    }
    if (entry.count >= this.max) return false
    entry.count += 1
    return true
  }

  private allowSliding(key: string, now: number): boolean {
    const cutoff = now - this.windowMs
    const timestamps = this.slidingTimestamps.get(key) ?? []
    let firstFresh = 0
    while (firstFresh < timestamps.length && timestamps[firstFresh] <= cutoff) {
      firstFresh += 1
    }
    const fresh = firstFresh > 0 ? timestamps.slice(firstFresh) : timestamps
    if (fresh.length >= this.max) {
      this.slidingTimestamps.set(key, fresh)
      return false
    }
    fresh.push(now)
    this.slidingTimestamps.set(key, fresh)
    return true
  }
}
