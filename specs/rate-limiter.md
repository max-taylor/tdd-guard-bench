# Rate Limiter

## Context
A small in-memory rate limiter for a Node.js service that gates incoming
requests by identifier (e.g., API key, user ID, IP). Used to prevent abuse
and ensure fair use of downstream resources.

## Interface
Implement a `RateLimiter` class:
- Constructor accepts a maximum number of requests allowed within a time
  window (in milliseconds).
- `allow(key: string): boolean` — returns whether the request should be
  permitted at the current moment.
- Additional methods are at your discretion.

## Functional requirements
1. Multiple independent keys must be tracked separately.
2. The limiter enforces a configurable rate: at most N requests per W
   milliseconds for each key.
3. When a key exceeds its rate, subsequent calls to `allow` for that key
   return false until capacity is restored.
4. Capacity restores over time as the window advances.

## Example
A limiter configured for 5 requests per 1000ms should permit 5 successive
calls to `allow('user-1')` and deny the 6th if they all occur within the
same window.

## Constraints
- TypeScript, strict mode
- No external runtime dependencies
- Source in `src/`
