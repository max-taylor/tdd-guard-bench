interface KeyState {
  count: number
  windowIndex: number
}

export class RateLimiter {
  private max: number
  private windowMs: number
  private mode: 'fixed' | 'sliding'
  private state = new Map<string, KeyState>()
  private timestamps = new Map<string, number[]>()

  constructor(options: { max: number; windowMs: number; mode: 'fixed' | 'sliding' }) {
    this.max = options.max
    this.windowMs = options.windowMs
    this.mode = options.mode
  }

  allow(key: string): boolean {
    const now = Date.now()
    if (this.mode === 'sliding') {
      const cutoff = now - this.windowMs
      const ts = this.timestamps.get(key) ?? []
      const fresh = ts.filter((t) => t > cutoff)
      if (fresh.length >= this.max) {
        this.timestamps.set(key, fresh)
        return false
      }
      fresh.push(now)
      this.timestamps.set(key, fresh)
      return true
    }
    const windowIndex = Math.floor(now / this.windowMs)
    const entry = this.state.get(key)
    if (!entry || entry.windowIndex !== windowIndex) {
      this.state.set(key, { count: 1, windowIndex })
      return true
    }
    if (entry.count >= this.max) return false
    entry.count++
    return true
  }

  reset(key: string): void {
    this.state.delete(key)
    this.timestamps.delete(key)
  }
}
