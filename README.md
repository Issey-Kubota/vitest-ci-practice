# Vitest CI Practice

A TypeScript sample for comparing the execution time of Vitest tests after changing their imports, while preserving the tests themselves. Practice a repeatable workflow: **measure → change one thing → measure under the same conditions → verify test preservation**.

This repository is for developers learning how to evaluate test performance locally and in CI. Clone and run the sample; it does not automatically diagnose or optimize arbitrary projects.

## Features

- Run baseline and candidate tests three times each, in alternating order.
- Record wall time and optional CPU time while preserving test IDs, assertions, snapshots, and coverage settings.
- Inject a known implementation defect and check that both import variants detect it.
- Save reports, coverage, and logs, distinguishing valid measurements from invalid ones.
- Run the validation workflow locally or through GitHub Actions.

## What is compared?

The baseline imports through a barrel that re-exports 48 modules. The candidate imports the required module directly. Each module builds a lookup index at import time, allowing you to test whether avoiding unnecessary module initialization reduces execution time.

```diff
-import { key01, lookup01 } from '../src/features/index.js'
+import { key01, lookup01 } from '../src/features/feature-01.js'
```

Only the import path changes across the 16 test files. Both variants retain 32 tests, 48 assertions, 16 inline snapshots, and the same coverage configuration.

## Requirements

Use an existing **compatible Node.js environment**; the sample no longer requires Linux x64 or exact Node.js/npm versions. Supported Node release families are **22.12+ within 22.x, 24.x, and 26+**, matching the bundled Vitest requirements. Node 20, 23, and 25 are outside that dependency's supported range.

OS, architecture, and version differences from the historical environment are recorded as warnings, not rejected. Dependencies are installed from the committed lockfile. Missing dependencies and an incompatible Node release still stop execution.

The table below describes the reference environment used for earlier measurements and the included CI, not a required local setup. Native Windows execution uses Node directly, without Bash. Windows/macOS execution paths have regression coverage but have not yet been verified by an end-to-end run on those operating systems. Linux remains the previously measured environment.

| Component | Version or setting |
|---|---|
| Node.js | 24.19.0 |
| npm | 11.9.0 |
| Vitest / @vitest/coverage-v8 | 5.0.1 / 5.0.1 |
| Vite / TypeScript | 8.3.0 / 5.9.2 |
| Test environment | Node, forks pool, isolation enabled |
| Parallelism | 4 workers, fileParallelism enabled |
| Coverage thresholds | 95% lines / functions / statements; 75% branches |

Keep the same environment for both variants in one batch. Actual versions are recorded in the output; a change during the batch invalidates the comparison. Results from different environments or commits are separate observations.

## Quick start

Install Git, a compatible Node.js release, and npm first. Initial dependency installation requires network access.

```bash
git clone https://github.com/Issey-Kubota/vitest-ci-practice.git
cd vitest-ci-practice

node --version
npm --version
npm ci

# 1. Before measurement: check the tests against the fixed reference.
npm run verify:manifest

# 2. Switch imports, measure both variants, and restore the original tests.
npm run measure

# 3. After measurement: check that no unexpected test changes remain.
npm run verify:manifest
```

`npm ci` installs the dependencies recorded in the lockfile. It does not install Node.js or npm themselves.

### Why run the same check before and after measurement?

`verify:manifest` compares the current `tests/` directory with the fixed reference in `reference/baseline-tests.json`. It neither runs tests nor rewrites files or references. Both checks use the same reference, but serve different purposes.

| Step | What happens | Purpose |
|---|---|---|
| Before: `verify:manifest` | Compare the inventory and full contents of all 16 files, allowing only designated import changes and LF/CRLF differences | Start with a valid, comparable set of tests |
| `measure` | Alternate baseline/candidate imports, run each three times, then restore the starting contents | Compare import strategies using the same tests |
| After: `verify:manifest` | Compare the restored tests with the same fixed reference | Independently confirm that the tests remain valid |

The manifest check accepts either a consistent baseline or a consistent candidate. It does not itself prove that the final files are identical to their starting state. **The measurement script verifies that restoration is byte-for-byte identical to the starting contents and records the result as `restoration.restored` in `summary.json`.**

Successful manifest checks print `valid: true`. If a command fails, inspect `reasons` or `fatalReasons` before continuing. Runtime compatibility, source files, the lockfile, and Vitest configuration are checked separately by `measure`. Environment differences are listed in `warnings`; blocking errors remain in `fatalReasons`. Use `npm ci` to install the bundled dependency versions.

**Use a working copy without uncommitted changes.** Do not edit the sample or run concurrent measurements while these commands are running.

## Reading results

See **[Output examples and interpretation](docs/output-guide.md)** for console output, saved JSON examples, field meanings, and troubleshooting. It covers summaries, individual measurements, test results, coverage, and fault checks.

Each measurement creates a new `artifacts/measure-*/` directory.

| Output | Contents |
|---|---|
| `summary.json` | Per-run measurements, validity reasons, medians, conditions, and restoration |
| Per-run Vitest JSON | Test and snapshot results |
| Per-run coverage and logs | Coverage details, stdout, and stderr |

First check that all six runs are valid, then compare individual values and medians. Startup failures, missing or stale output, and mismatched conditions or tests invalidate a measurement and cause the command to fail. Missing measurements are never treated as zero seconds.

Wall time is elapsed time from start to finish. When Bash is available on a non-Windows host, CPU time is summed across processes, including parallel workers, and may exceed wall time. It is not CI runner occupancy or billable time. Without Bash (including native Windows), all six runs use wall-only timing: CPU fields are `null`, a warning explains why, and valid wall-time comparisons are still produced.

Results vary by environment and execution. `artifacts/` is created at runtime and excluded from Git; historical measurement files are not bundled.

## Checking defect detection

```bash
npm run failure-check
npm run verify:manifest
```

For both import variants, this checks that:

1. The healthy implementation passes.
2. A known implementation defect causes the expected test to fail.
3. A missing executable is classified as an environment error rather than successful defect detection.

Results are saved under `artifacts/failure-*/`. Source and test files are restored afterward. These targeted checks run two tests with coverage disabled and are separate from performance measurements.

## Running on GitHub Actions

Fork the repository and enable GitHub Actions in your fork.

1. Open **Actions**.
2. Select **Vitest validation** from the included [workflows](.github/workflows).
3. Choose **Run workflow** and select `main`.
4. Inspect the steps and download the reports from **Artifacts**.

The workflow runs manually only. A single job installs dependencies, measures performance, checks defect detection, tests the helper scripts, and verifies file restoration. Its timeout is 15 minutes, and artifacts are retained for 30 days.

Only a new run on `main` is accepted. Use **Run workflow** again instead of **Re-run jobs**. See [CI configuration and workflow](docs/ci-workflow.md) for details.

## Repository layout

| Path | Purpose |
|---|---|
| `src/` | TypeScript sample implementation |
| `tests/` | Feature tests and inline snapshots |
| `scripts/` | Measurement and validation helpers, development tests, and test-only `fixtures/` |
| `reference/` | Baseline tests and fixed comparison conditions |
| `artifacts/` | Generated measurement reports and logs; not tracked by Git |
| `results/` | Generated output from individual test commands; not tracked by Git |
| `docs/` | CI instructions, test/reference documentation, and output examples |

## Development checks

After changing measurement or validation helpers, run:

```bash
node --test --test-concurrency=1 scripts/check-manifest.test.mjs scripts/check-measure.test.mjs scripts/check-failure.test.mjs scripts/check-environment.test.mjs
```

These tests include simulated error cases. `scripts/fixtures/vitest-success.json` is minimal test input, not performance evidence. Historical execution logs are not required.

## Limitations and precautions

- **Direct imports are not always appropriate.** If a barrel is a public API entry point, retain tests for its exports and public import paths.
- The sample does not use external APIs, databases, or the DOM. Browser Mode, external I/O, state/order dependencies, and combining multiple CI jobs are outside its scope.
- Each measurement clears the Vite cache and disables the Node compile cache. OS caches and host load are not controlled. Short measurements vary; no speedup is guaranteed.
- Detecting one known defect does not guarantee detection of all defects or overall software quality.
- Use `measure` for normal comparisons. `test:baseline` and `test:candidate` switch test files and overwrite `results/current.json`. `generate` is a maintenance command and is not needed for normal use.
- Logs contain environment paths. Review them before sharing and remove credentials, private code, and other sensitive information.

## Line endings

Reference, test, and protected-input comparisons treat CRLF as LF. Whitespace, expectations, code, and all other changes are still checked. Validation does not rewrite the files. Restoration preserves the original bytes, including the original line endings. Comparison hashes describe LF-normalized contents.

`.gitattributes` requests LF for Git checkouts. Existing CRLF working copies are also accepted by the validators. The measurement script also avoids Windows command shims and normalizes report path separators. Native Windows end-to-end validation is still pending.

## Issues and questions

Use [GitHub Issues](https://github.com/Issey-Kubota/vitest-ci-practice/issues). Include your OS, Node.js/npm versions, command, expected behavior, and actual behavior. Share relevant log excerpts with personal and confidential information removed.

## License

[MIT License](LICENSE)

## Compare worker limits

To explore a second optimization method while keeping imports fixed, run `npm run measure:workers` once. It compares maximum worker limits 1, 2 and 4 with five measurements each. See [the worker comparison guide](docs/worker-comparison.md) for the method, result fields and limitations. This experiment has no published performance results yet.
