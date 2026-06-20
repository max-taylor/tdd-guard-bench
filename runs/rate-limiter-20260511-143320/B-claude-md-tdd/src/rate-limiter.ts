type Mode = 'fixed' | 'sliding'

interface Options {
  max: number
  windowMs: number
  mode: Mode
  now?: () => number
}

interface Bucket {
  windowStart: number
  count: number
}

export class RateLimiter {
  private readonly max: number
  private readonly windowMs: number
  private readonly mode: Mode
  private readonly now: () => number
  private readonly buckets = new Map<string, Bucket>()
  private readonly timestamps = new Map<string, number[]>()

  constructor(opts: Options) {
    this.max = opts.max
    this.windowMs = opts.windowMs
    this.mode = opts.mode
    this.now = opts.now ?? Date.now
  }

  reset(key: string): void {
    this.buckets.delete(key)
    this.timestamps.delete(key)
  }

  allow(key: string): boolean {
    const t = this.now()
    if (this.mode === 'sliding') return this.allowSliding(key, t)
    return this.allowFixed(key, t)
  }

  private allowFixed(key: string, t: number): boolean {
    const windowStart = Math.floor(t / this.windowMs) * this.windowMs
    const bucket = this.buckets.get(key)
    if (!bucket || bucket.windowStart !== windowStart) {
      this.buckets.set(key, { windowStart, count: 1 })
      return true
    }
    if (bucket.count >= this.max) return false
    bucket.count++
    return true
  }

  private allowSliding(key: string, t: number): boolean {
    const cutoff = t - this.windowMs
    let stamps = this.timestamps.get(key)
    if (!stamps) {
      stamps = []
      this.timestamps.set(key, stamps)
    }
    while (stamps.length > 0 && stamps[0] <= cutoff) stamps.shift()
    if (stamps.length >= this.max) return false
    stamps.push(t)
    return true
  }
}
