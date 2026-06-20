export interface RateLimiterOptions {
  max: number
  windowMs: number
  mode: 'fixed' | 'sliding'
  now?: () => number
}

interface FixedBucket {
  windowStart: number
  count: number
}

export class RateLimiter {
  private readonly max: number
  private readonly windowMs: number
  private readonly mode: 'fixed' | 'sliding'
  private readonly now: () => number
  private readonly fixedBuckets = new Map<string, FixedBucket>()
  private readonly slidingTimestamps = new Map<string, number[]>()

  constructor(options: RateLimiterOptions) {
    this.max = options.max
    this.windowMs = options.windowMs
    this.mode = options.mode
    this.now = options.now ?? Date.now
  }

  allow(key: string): boolean {
    const t = this.now()
    if (this.mode === 'sliding') return this.allowSliding(key, t)
    return this.allowFixed(key, t)
  }

  reset(key: string): void {
    this.fixedBuckets.delete(key)
    this.slidingTimestamps.delete(key)
  }

  private allowFixed(key: string, t: number): boolean {
    const windowStart = Math.floor(t / this.windowMs) * this.windowMs
    const bucket = this.fixedBuckets.get(key)
    if (!bucket || bucket.windowStart !== windowStart) {
      this.fixedBuckets.set(key, { windowStart, count: 1 })
      return true
    }
    if (bucket.count >= this.max) return false
    bucket.count += 1
    return true
  }

  private allowSliding(key: string, t: number): boolean {
    const cutoff = t - this.windowMs
    const stamps = this.slidingTimestamps.get(key) ?? []
    let firstFresh = 0
    while (firstFresh < stamps.length && stamps[firstFresh] <= cutoff) {
      firstFresh += 1
    }
    const fresh = firstFresh === 0 ? stamps : stamps.slice(firstFresh)
    if (fresh.length >= this.max) {
      this.slidingTimestamps.set(key, fresh)
      return false
    }
    fresh.push(t)
    this.slidingTimestamps.set(key, fresh)
    return true
  }
}
