# Follow-up: per-key reset

## New requirement
Expose a `reset(key: string): void` method on `RateLimiter` that clears the recorded usage for a single key, restoring its full capacity at the moment of the call.

## Behaviour
- After `reset(key)`, the next `allow(key)` call must behave as though `key` had never been seen before.
- `reset` only affects the named key. Other keys' usage is unchanged.
- Calling `reset` on a key that has no recorded usage is a no-op (does not throw).
- All existing `allow` behaviour must continue to hold.

## Example

    const limiter = new RateLimiter({ max: 2, windowMs: 1000, mode: 'fixed' })
    limiter.allow('user-1')   // → true
    limiter.allow('user-1')   // → true
    limiter.allow('user-1')   // → false (at capacity)

    limiter.reset('user-1')
    limiter.allow('user-1')   // → true (full capacity restored)

    limiter.allow('user-2')   // → true (other keys unaffected by reset of 'user-1')
