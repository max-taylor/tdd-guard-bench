# Follow-up: server-supplied retry delay

## New requirement
When a thrown error carries a `retryAfterMs` property whose value is a finite, non-negative number, use that value as the delay before the next attempt instead of the computed exponential backoff.

## Behaviour
- If `error.retryAfterMs` is a finite non-negative number, the next sleep equals that value (jitter is *not* applied on top — the server has spoken).
- If `error.retryAfterMs` is missing, non-numeric, negative, or non-finite, fall back to the existing exponential-backoff-with-jitter behaviour.
- The decision happens per attempt: a flaky `fn` may produce a `retryAfterMs` error on one attempt and a plain error on the next; each attempt's delay is computed independently.
- All other rules are unchanged: `shouldRetry` still gates whether to retry at all, `maxAttempts` still caps total invocations.

## Example

    class ThrottledError extends Error {
      retryAfterMs = 250
    }

    let calls = 0
    await retry(
      async () => {
        calls++
        if (calls < 3) throw new ThrottledError('slow down')
        return 'ok'
      },
      { maxAttempts: 5, baseDelayMs: 100, shouldRetry: () => true }
    )
    // → resolves with 'ok'; the two retries each waited 250ms (not the
    //    exponential 100/200ms with jitter)
