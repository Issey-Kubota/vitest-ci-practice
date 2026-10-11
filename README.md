# Vitest CI Practice

A TypeScript sample for exploring **when and how changes to imports or worker limits affect Vitest execution time**. Run controlled comparisons in your own environment, inspect the results, and check that the required tests remain intact.

This repository is for developers investigating slow local or CI tests. It provides two experiments on the bundled sample, not automatic diagnosis or optimization of arbitrary projects.

## Features

- Compare barrel imports with direct imports, or compare maximum worker limits of 1, 2 and 4.
- Run each condition multiple times in an interleaved order and report medians and observed ranges.
- Keep test IDs, assertions, snapshots and coverage settings fixed across conditions.
- Save fresh reports, coverage and logs, with explicit reasons for rejected measurements.
- Check whether both import variants detect a known implementation defect.
- Use compatible local Node.js environments, including wall-only timing on Windows.

## Experiments

Both experiments use 16 test files containing 32 tests, 48 assertions and 16 inline snapshots. Coverage is enabled during performance measurements.

| Experiment | Command | Changes | Keeps fixed | Runs |
|---|---|---|---|---|
| Import paths | `npm run measure` | Barrel vs. direct imports | Maximum 4 workers, isolation, tests and coverage | 3 per variant; 6 total |
| Worker limits | `npm run measure:workers` | `maxWorkers` of 1, 2 and 4 | Current import variant, isolation, tests and coverage | 5 per limit; 15 total |

### Import paths

The baseline imports through a barrel that re-exports 48 modules. The candidate imports the required module directly. Each module builds a lookup index at import time, so this experiment tests whether avoiding unnecessary initialization reduces execution time.

```diff
-import { key01, lookup01 } from '../src/features/index.js'
+import { key01, lookup01 } from '../src/features/feature-01.js'
```

The script switches imports automatically across all 16 test files and restores their original bytes afterward. It does not replace implementations with mocks or remove tests.

### Worker limits

This experiment passes `--maxWorkers=1`, `--maxWorkers=2` or `--maxWorkers=4` to Vitest while preserving the import variant present at the start. A normal checkout uses candidate imports. The limit is a concurrency ceiling, not a guarantee that every worker is continuously busy.

More workers can help independent test files, but process startup, memory pressure and limited CPU resources can offset that benefit. Compare in your own environment. The sample's existing configuration already uses a maximum of 4 workers; a comparison against 1 worker does not establish an additional speedup over that default.

See [Worker comparison method and interpretation](docs/worker-comparison.md) for the 15-run order and experimental limitations.

## Requirements

- Node.js **22.12+ within 22.x, 24.x, or 26+**, matching the bundled Vitest requirements. Node 20, 23 and 25 are outside that dependency's supported range.
- npm to install the dependencies recorded in the lockfile.
- Network access for the initial dependency installation.
- Git if cloning the repository; Git is not required when downloading a release ZIP.

OS, architecture and Node.js/npm differences from the historical reference environment are recorded as warnings. Missing dependencies and an incompatible Node release still block execution. Keep the environment unchanged throughout each batch; detected runtime or dependency changes invalidate the comparison.

The maintainer has reported successful native Windows x64 execution of both experiments using Node v24.21.0 and npm 11.19.0. Earlier import measurements were performed on Linux. macOS end-to-end execution remains unverified. These observations are separate from helper regression tests and do not establish performance for other environments or commits.

## Quick start

Clone the repository, or download and extract a source ZIP from [Releases](https://github.com/Issey-Kubota/vitest-ci-practice/releases). For an article or reproducible report, use the exact tag or commit it identifies.

```bash
git clone https://github.com/Issey-Kubota/vitest-ci-practice.git
cd vitest-ci-practice
```

In the sample directory, check your tools and install dependencies:

```bash
node --version
npm --version
npm ci
```

`npm ci` installs the lockfile dependencies. It does not install Node.js or npm themselves.

**Choose one experiment below. Run its measurement command once:** the script performs the whole batch automatically. You can try the other experiment afterward as a separate batch.

### Compare import paths

```bash
# Confirm the starting test contents against the fixed reference.
npm run verify:manifest

# Run baseline/candidate alternately, three times each; restore the tests.
npm run measure

# Independently check the test contents after measurement.
npm run verify:manifest
```

### Compare worker limits

```bash
# Confirm the starting test contents against the fixed reference.
npm run verify:manifest

# Keep imports fixed; run five measurements each at limits 1, 2 and 4.
npm run measure:workers

# Independently check the test contents after measurement.
npm run verify:manifest
```

Use a fresh working copy without local edits. Do not edit files or run concurrent measurements during a batch. If a command fails, inspect its reasons before continuing.

### Why check the manifest before and after?

`verify:manifest` compares the current `tests/` directory with `reference/baseline-tests.json`. It does not execute tests or rewrite files. Both checks use the same reference: the first establishes a valid starting point; the second confirms that the ending contents remain valid.

The check permits a consistent baseline or candidate import variant and LF/CRLF differences. It does not itself prove that final files are byte-for-byte identical to their starting state. Both measurement modes separately verify byte-for-byte restoration and record `restoration.restored` in `summary.json`.

A successful manifest check prints `valid: true`. The measurement commands also check runtime compatibility, protected source files, the lockfile and Vitest configuration.

## Reading results

Each batch prints its output directory and saves evidence in a new `artifacts/measure-*/` directory.

| Check | Import comparison | Worker comparison |
|---|---|---|
| Successful batch | `complete: true`, valid 6, invalid 0, no fatal reasons | `complete: true`, valid 15, invalid 0, no fatal reasons |
| Comparison groups | `baseline`, `candidate` | `workers-1`, `workers-2`, `workers-4` |
| Samples per group | 3 | 5 |
| Timing fields | `medianWallMs`, `minWallMs`, `maxWallMs`, optional `medianCpuMs` | Same fields |

First establish that the whole batch is valid, then compare medians and individual runs. **Completion does not mean a speedup:** valid measurements can show that a change is slower. Any invalid run prevents a batch comparison; missing measurements are never treated as zero seconds.

| Saved evidence | Contents |
|---|---|
| `summary.json` | All records, comparison, environment, warnings and restoration |
| Per-run `record.json` | Timing, command, validity checks and rejection reasons |
| Per-run `vitest.json` | Individual test and snapshot results |
| Per-run coverage and logs | Coverage summary, stdout and stderr |

`wallMs` is elapsed time in milliseconds. `minWallMs` and `maxWallMs` describe the observed range, not a confidence interval. When Bash is available on a non-Windows host, CPU time is summed across processes, including parallel workers, and may exceed wall time. It is not CI occupancy or billable time.

Without Bash, including native Windows, the entire batch uses `wall-only` timing. CPU values are `null`; `cpu_timing_unavailable` explains the omission. `reference_environment_differs` records differences from the historical reference, not a failed measurement. Blocking errors appear in `fatalReasons` or per-run `reasons`.

Keep observations from different environments or commits separate. Review logs for personal or confidential paths before sharing them. Generated evidence is excluded from Git and is not bundled with releases.

- [Output examples and troubleshooting](docs/output-guide.md)
- [Worker comparison design and interpretation](docs/worker-comparison.md)

## Checking defect detection

```bash
npm run failure-check
npm run verify:manifest
```

For both import variants, the helper checks a healthy implementation, detection of a known defect and classification of a missing executable as an environment error. It restores source and test files and saves evidence in `artifacts/failure-*/`.

This is a separate check of two tests with coverage disabled. It is not part of either performance batch and does not guarantee detection of all defects.

## Running on GitHub Actions

The included **Vitest validation** workflow measures the **import comparison**, checks defect detection, runs helper regression tests and verifies restoration. It does **not** run the 15-measurement worker experiment.

1. Fork the repository and enable GitHub Actions in your fork.
2. Open **Actions → Vitest validation**.
3. Choose **Run workflow** and select `main`.
4. Inspect the job and download its Artifacts.

The workflow is manual only, with a 15-minute timeout and 30-day artifact retention. Only a new run on `main` is accepted; use **Run workflow** rather than **Re-run jobs**. Record the selected commit, because a fork's main can differ from an article's release.

The reference CI pins Ubuntu 24.04/Linux x64, Node.js 24.19.0 and npm 11.9.0. Those exact versions are not mandatory for local execution. Earlier CI success is evidence for its recorded commit, not proof of a new run on the current main.

See [CI configuration and workflow](docs/ci-workflow.md).

## Limitations and precautions

- These helpers target the bundled sample. Applying the comparison method to another project requires its own test inventory, configuration and validation.
- Direct imports are not always appropriate. Keep public API export and import-path tests when a barrel is the supported entry point.
- Worker comparisons measure whole Vitest processes with coverage enabled, not coverage-free tests or an entire CI job.
- Each run starts a fresh process, clears the Vite cache and disables Node compile cache. OS caches and competing workloads are not controlled; there are no excluded warmup runs and no speedup guarantee.
- External APIs, databases, DOM/Browser Mode, state/order dependencies and combining multiple CI jobs are outside this sample's scope.
- `test:baseline` and `test:candidate` switch imports and overwrite `results/current.json`; use the measurement commands for normal comparisons. `generate` is a maintenance command.
- LF and CRLF are treated equivalently during reference validation. Other changes remain checked, and restoration preserves original bytes. Git checkouts request LF through `.gitattributes`.

## Repository layout

| Path | Purpose |
|---|---|
| `src/` | TypeScript sample implementation |
| `tests/` | Feature tests and inline snapshots |
| `scripts/` | Measurement/validation helpers and synthetic regression fixtures |
| `reference/` | Test baseline and protected comparison inputs |
| `docs/` | Experiment guides, output examples and CI instructions |
| `artifacts/` | Generated batch reports and logs; not tracked by Git |
| `results/` | Generated individual-test output; not tracked by Git |

## Development checks

After changing measurement or validation helpers, run:

```bash
node --test --test-concurrency=1 scripts/check-manifest.test.mjs scripts/check-measure.test.mjs scripts/check-failure.test.mjs scripts/check-environment.test.mjs
```

These regressions simulate orchestration and error cases. Synthetic reports never produce performance comparisons and are not real measurement evidence.

## Issues and questions

Use [GitHub Issues](https://github.com/Issey-Kubota/vitest-ci-practice/issues). Include the tag/commit, experiment, OS, Node.js/npm versions, command, expected behavior and actual behavior. Share relevant summaries with personal and confidential information removed.

## License

[MIT License](LICENSE)
