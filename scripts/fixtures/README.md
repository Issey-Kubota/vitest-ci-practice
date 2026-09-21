# Reporter test fixture

`vitest-success.json` is a minimal Vitest reporter-shaped input for `check-measure.test.mjs`. It contains the fixed sample's test IDs and success states, a deliberately stale timestamp (`0`), and neutral `/fixture` paths. Measured durations, environment-specific paths, and raw coverage maps are omitted.

The regression tests supply synthetic timestamps and coverage summaries, then exercise missing output, stale output, incorrect IDs, and partial batches. This file is test input, not benchmark evidence. Normal measurement and failure checks do not read it.
