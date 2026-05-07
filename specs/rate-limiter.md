# Rate Limiter

## Context
A small in-memory rate limiter for a Node.js service that gates incoming
requests by identifier (e.g., API key, user ID, IP). The service needs
both a classic per-window counter and a smoother per-request lookback,
selectable at construction time.

## Interface
Implement a `RateLimiter` class with the following construction shape:

    new RateLimiter({
      max: number,       // maximum requests allowed
      windowMs: number,  // window size in milliseconds
      mode: 'fixed' | 'sliding'
    })

- `allow(key: string): boolean` — returns whether the request should be
  permitted at the current moment.
- Additional methods are at your discretion.

## Functional requirements
1. Multiple independent keys must be tracked separately.
2. The limiter enforces a configurable rate: at most `max` requests per
   `windowMs` milliseconds for each key.
3. The limiter supports two modes selected at construction:
   - **`fixed`** — counts requests within discrete time windows of size
     `windowMs`. Within a window, once `max` is reached, further calls
     return false until the next window begins.
   - **`sliding`** — counts requests within the trailing `windowMs`
     relative to the current call. Once `max` requests have occurred in
     that trailing window, further calls return false until older
     requests age out.
4. When a key exceeds its rate, `allow` returns false until capacity is
   restored according to the configured mode.

## Examples
With `{ max: 5, windowMs: 1000, mode: 'fixed' }`:
- 5 successive calls to `allow('user-1')` within the same window return
  true; the 6th returns false. After the window ends, capacity resets.

With `{ max: 5, windowMs: 1000, mode: 'sliding' }`:
- After 5 calls at t=0, a 6th call at t=500 returns false. A call at
  t=1100 returns true, because the call at t=0 has aged out.

## Constraints
- TypeScript, strict mode
- No external runtime dependencies
- Source in `src/`
