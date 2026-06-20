# Retry with Policy

## Context
A retry utility for a Node.js service that wraps potentially failing
asynchronous operations (e.g., network requests, transient DB errors)
with configurable retry behavior. The utility distinguishes between
retryable and non-retryable failures and applies backoff between
attempts.

## Interface
Implement a `retry` function with the following signature:

    function retry<T>(
      fn: () => Promise<T>,
      options: {
        maxAttempts: number,
        baseDelayMs: number,
        shouldRetry: (error: unknown) => boolean
      }
    ): Promise<T>

## Functional requirements
1. Execute `fn`. If it resolves, return its resolved value.
2. If `fn` rejects, call `shouldRetry` with the error. If it returns
   false, propagate the error immediately.
3. If `shouldRetry` returns true, wait and retry, up to a total of
   `maxAttempts` invocations of `fn`.
4. Delays between attempts follow exponential backoff based on
   `baseDelayMs`. The delay grows with each retry.
5. Jitter is applied to delays to avoid synchronized retries across
   multiple callers.
6. If all attempts are exhausted, propagate the final error.

## Examples

Successful first attempt:

    await retry(() => fetchUser('123'), {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true
    })
    // → resolves with the user; no delays incurred

Retry then succeed:

    let calls = 0
    await retry(() => {
      calls++
      if (calls < 3) throw new Error('flaky')
      return 'ok'
    }, { maxAttempts: 5, baseDelayMs: 100, shouldRetry: () => true })
    // → resolves with 'ok' after two failed attempts

Non-retryable error:

    await retry(
      async () => { throw new ValidationError('bad input') },
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: (e) => !(e instanceof ValidationError)
      }
    )
    // → rejects with ValidationError immediately; no retries attempted

## Constraints
- TypeScript, strict mode
- No external runtime dependencies
- Source in `src/`
