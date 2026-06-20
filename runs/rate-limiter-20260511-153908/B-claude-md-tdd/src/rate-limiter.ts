export type RateLimiterMode = 'fixed' | 'sliding'

export interface RateLimiterOptions {
  max: number
  windowMs: number
  mode: RateLimiterMode
  now?: () => number
}

interface FixedEntry {
  windowStart: number
  count: number
}

export class RateLimiter {
  private readonly max: number
  private readonly windowMs: number
  private readonly mode: RateLimiterMode
  private readonly now: () => number
  private fixedEntries = new Map<string, FixedEntry>()
  private slidingEntries = new Map<string, number[]>()

  constructor(options: RateLimiterOptions) {
    this.max = options.max
    this.windowMs = options.windowMs
    this.mode = options.mode
    this.now = options.now ?? (() => Date.now())
  }

  allow(key: string): boolean {
    return this.mode === 'fixed' ? this.allowFixed(key) : this.allowSliding(key)
  }

  reset(key: string): void {
    this.fixedEntries.delete(key)
    this.slidingEntries.delete(key)
  }

  private allowFixed(key: string): boolean {
    const t = this.now()
    const windowStart = Math.floor(t / this.windowMs) * this.windowMs
    const entry = this.fixedEntries.get(key)
    if (!entry || entry.windowStart !== windowStart) {
      this.fixedEntries.set(key, { windowStart, count: 1 })
      return true
    }
    if (entry.count >= this.max) return false
    entry.count += 1
    return true
  }

  private allowSliding(key: string): boolean {
    const t = this.now()
    const cutoff = t - this.windowMs
    const timestamps = this.slidingEntries.get(key) ?? []
    const fresh = timestamps.filter((ts) => ts > cutoff)
    if (fresh.length >= this.max) {
      this.slidingEntries.set(key, fresh)
      return false
    }
    fresh.push(t)
    this.slidingEntries.set(key, fresh)
    return true
  }
}
