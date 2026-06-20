export interface RateLimiterOptions {
  max: number
  windowMs: number
  mode: 'fixed' | 'sliding'
}

interface FixedBucket {
  windowStart: number
  count: number
}

export class RateLimiter {
  private readonly max: number
  private readonly windowMs: number
  private readonly mode: 'fixed' | 'sliding'
  private readonly fixedBuckets = new Map<string, FixedBucket>()
  private readonly slidingTimestamps = new Map<string, number[]>()

  constructor(options: RateLimiterOptions) {
    this.max = options.max
    this.windowMs = options.windowMs
    this.mode = options.mode
  }

  allow(key: string): boolean {
    const now = Date.now()
    return this.mode === 'fixed'
      ? this.allowFixed(key, now)
      : this.allowSliding(key, now)
  }

  reset(key: string): void {
    this.fixedBuckets.delete(key)
    this.slidingTimestamps.delete(key)
  }

  private allowFixed(key: string, now: number): boolean {
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs
    const bucket = this.fixedBuckets.get(key)
    if (!bucket || bucket.windowStart !== windowStart) {
      this.fixedBuckets.set(key, { windowStart, count: 1 })
      return true
    }
    if (bucket.count >= this.max) return false
    bucket.count++
    return true
  }

  private allowSliding(key: string, now: number): boolean {
    const cutoff = now - this.windowMs
    const timestamps = this.slidingTimestamps.get(key) ?? []
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift()
    }
    if (timestamps.length >= this.max) {
      this.slidingTimestamps.set(key, timestamps)
      return false
    }
    timestamps.push(now)
    this.slidingTimestamps.set(key, timestamps)
    return true
  }
}
