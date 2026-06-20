export type RateLimiterMode = 'fixed' | 'sliding'

export interface RateLimiterOptions {
  max: number
  windowMs: number
  mode: RateLimiterMode
  now?: () => number
}

interface FixedBucket {
  windowStart: number
  count: number
}

export class RateLimiter {
  private readonly max: number
  private readonly windowMs: number
  private readonly mode: RateLimiterMode
  private readonly now: () => number
  private readonly fixedBuckets = new Map<string, FixedBucket>()
  private readonly slidingTimestamps = new Map<string, number[]>()

  constructor(options: RateLimiterOptions) {
    this.max = options.max
    this.windowMs = options.windowMs
    this.mode = options.mode
    this.now = options.now ?? (() => Date.now())
  }

  allow(key: string): boolean {
    const t = this.now()
    return this.mode === 'fixed' ? this.allowFixed(key, t) : this.allowSliding(key, t)
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
    let timestamps = this.slidingTimestamps.get(key)
    if (!timestamps) {
      timestamps = []
      this.slidingTimestamps.set(key, timestamps)
    }
    let drop = 0
    while (drop < timestamps.length && timestamps[drop]! <= cutoff) drop += 1
    if (drop > 0) timestamps.splice(0, drop)
    if (timestamps.length >= this.max) return false
    timestamps.push(t)
    return true
  }
}
