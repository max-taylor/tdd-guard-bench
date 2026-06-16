# Rate Limiter — Edge Case Grading Rubric

Committed before any runs. Score 1 per item if the run's test suite
exercises the behavior; 0 if absent.

 1. Zero allowance (N=0) — allow always returns false
 2. First call for a new key — returns true (full capacity initially)
 3. Capacity restoration — after W ms with no calls, full capacity returns
 4. Multiple independent keys — usage on key A does not affect key B
 5. Boundary timing — behavior at exactly t=W ms is well-defined and tested
 6. Burst behavior — explicit decision tested (N at once, or smoothed)
 7. Concurrent/async calls to same key — no oversubscription under interleaving
 8. Many keys — bounded memory or documented unbounded behavior
 9. Time monotonicity — behavior when clock is non-monotonic
10. Empty / unusual key inputs — empty string, long string don't crash

Score: X/10 per run.
