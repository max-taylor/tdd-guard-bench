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
  private readonly slidingBuckets = new Map<string, number[]>()

  constructor(options: RateLimiterOptions) {
    if (!Number.isFinite(options.max) || options.max <= 0) {
      throw new Error('max must be a positive number')
    }
    if (!Number.isFinite(options.windowMs) || options.windowMs <= 0) {
      throw new Error('windowMs must be a positive number')
    }
    if (options.mode !== 'fixed' && options.mode !== 'sliding') {
      throw new Error("mode must be 'fixed' or 'sliding'")
    }

    this.max = options.max
    this.windowMs = options.windowMs
    this.mode = options.mode
    this.now = options.now ?? (() => Date.now())
  }

  allow(key: string): boolean {
    return this.mode === 'fixed' ? this.allowFixed(key) : this.allowSliding(key)
  }

  reset(key: string): void {
    this.fixedBuckets.delete(key)
    this.slidingBuckets.delete(key)
  }

  private allowFixed(key: string): boolean {
    const now = this.now()
    const bucket = this.fixedBuckets.get(key)

    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      this.fixedBuckets.set(key, { windowStart: now, count: 1 })
      return true
    }

    if (bucket.count >= this.max) {
      return false
    }

    bucket.count += 1
    return true
  }

  private allowSliding(key: string): boolean {
    const now = this.now()
    const cutoff = now - this.windowMs
    let timestamps = this.slidingBuckets.get(key)

    if (!timestamps) {
      timestamps = []
      this.slidingBuckets.set(key, timestamps)
    }

    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift()
    }

    if (timestamps.length >= this.max) {
      return false
    }

    timestamps.push(now)
    return true
  }
}
