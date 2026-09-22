# Output examples and interpretation

Start with the command output, then inspect `summary.json` for the overall result and each `record.json` for individual decisions. Open `vitest.json` for test details, `coverage/coverage-summary.json` for coverage, and `stdout.txt` / `stderr.txt` for execution diagnostics. All are readable in a text editor.

The successful measurement examples below use values from [a GitHub Actions run](https://github.com/Issey-Kubota/vitest-ci-practice/actions/runs/35611291375) at commit `655c46762be358e2342677317d1d872dc957faf4`. They are not new measurements of the current version or performance guarantees. Paths have been replaced with `/path/to/vitest-ci-practice`. File examples show selected fields; actual files also contain environment details, hashes, and other test records. Do not place these examples in an output directory as a substitute for real results.

## 1. Reference validation: verify:manifest

An excerpt from `npm run verify:manifest` follows. The command prints JSON to stdout; by itself, it does not save a result file.

```json
{
  "valid": true,
  "reasons": [],
  "variant": "candidate",
  "assertions": 48,
  "snapshots": 16
}
```

`valid: true` means the current tests match the fixed reference. It does not mean the tests have been executed successfully. `variant` identifies the import strategy: `baseline` uses the barrel, and `candidate` uses direct imports.

On failure, inspect `reasons`. `reference_digest_mismatch` means the reference differs from its expected contents. `unauthorized_test_change` means there is a change beyond the permitted import substitution. The current validators accept LF/CRLF differences. See [Tests and fixed references](test-inventory.md).

## 2. Measurement command output: measure

After completing all six runs, `npm run measure` prints a summary like this:

```json
{
  "output": "/path/to/vitest-ci-practice/artifacts/measure-4SgbKg",
  "complete": true,
  "validCount": 6,
  "invalidCount": 0,
  "fatalReasons": [],
  "comparison": {
    "baseline": {
      "samples": 3,
      "medianWallMs": 2226,
      "medianCpuMs": 6817
    },
    "candidate": {
      "samples": 3,
      "medianWallMs": 1517,
      "medianCpuMs": 4531
    }
  }
}
```

| Field | Meaning |
|---|---|
| `output` | Directory containing this execution's reports |
| `complete` | Whether all six runs are valid, no fatal errors occurred, and restoration was verified |
| `validCount` / `invalidCount` | Number of valid / invalid measurement attempts |
| `fatalReasons` | Errors affecting the overall process, such as preflight or restoration failures |
| `comparison` | Comparison of valid real measurements; `null` when unavailable |
| `samples` | Number of valid samples for that variant |
| `medianWallMs` | Median elapsed time in milliseconds; 2226 ms is 2.226 seconds |
| `medianCpuMs` | Median total CPU time in milliseconds, including parallel workers |

In this example, median wall time decreases from 2.226 to 1.517 seconds: a reduction of 0.709 seconds, or about 31.9%. CPU time sums work across processes and can exceed wall time. It is not CI runner occupancy or billable time.

**`complete: true` does not mean a speedup was achieved.** A slower candidate still produces `true` if measurement, validation, and restoration succeed. Inspect individual runs as well as medians.

## 3. Generated files

The suffix of `measure-*` changes on each execution. Results are saved in a new directory rather than overwriting existing reports.

| Path relative to measure-* | Contents |
|---|---|
| `summary.json` | All six records, comparison, environment, caches, and restoration |
| `1-baseline/record.json` | First run's validity, timings, conditions, and decision reasons |
| `1-baseline/vitest.json` | First run's Vitest test and snapshot results |
| `1-baseline/coverage/coverage-summary.json` | First run's coverage summary |
| `1-baseline/stdout.txt` / `stderr.txt` | First run's standard output / error |
| `2-candidate/` through `6-candidate/` | Equivalent files stored separately for the remaining runs |

The order is `1-baseline`, `2-candidate`, `3-baseline`, `4-candidate`, `5-baseline`, and `6-candidate`. If execution stops before measurement, the per-run directories or files may not exist.

### summary.json: overall result and restoration

This file contains more detail than the console summary. The following excerpt shows aggregation and restoration:

```json
{
  "validCount": 6,
  "invalidCount": 0,
  "complete": true,
  "fatalReasons": [],
  "comparison": {
    "baseline": {
      "samples": 3,
      "medianWallMs": 2226,
      "medianCpuMs": 6817
    },
    "candidate": {
      "samples": 3,
      "medianWallMs": 1517,
      "medianCpuMs": 4531
    }
  },
  "restoration": {
    "restored": true,
    "files": 16
  }
}
```

`restoration.restored: true` means saved test contents were restored and checked byte-for-byte against their starting state. `files: 16` is the number of saved files. If execution stopped before measurement and `files` is `0`, import switching was never reached. Do not infer measurement success from restoration alone; also inspect `complete`, counts, and errors.

The `records` array contains individual run details. `conditions`, `runner`, and `cache` describe the execution environment. Do not combine values from different environments or sessions into one comparison.

### record.json: one run's validity and timing

An excerpt from `1-baseline/record.json`:

```json
{
  "sequence": 1,
  "variant": "baseline",
  "attempt": 1,
  "valid": true,
  "reasons": [],
  "wallMs": 2226,
  "exitCode": 0,
  "jsonPresent": true,
  "totalRunnerCpuMs": 6817,
  "testCounts": {
    "total": 32,
    "passed": 32,
    "failed": 0,
    "skipped": 0,
    "todo": 0
  }
}
```

`sequence` is the overall execution order. `attempt` identifies the first, second, or third sample for that variant, not a GitHub Actions rerun attempt.

This record means the first baseline sample was valid, took 2.226 seconds, and passed all 32 tests. The file also contains `before` and `after` condition checks and `coverageTotals`.

Neither `exitCode: 0` nor `jsonPresent: true` alone establishes validity. The helper checks report freshness, required tests, coverage, and timing before setting `valid`.

### vitest.json: tests and snapshots

An excerpt from `1-baseline/vitest.json`:

```json
{
  "success": true,
  "numTotalTests": 32,
  "numPassedTests": 32,
  "numFailedTests": 0,
  "numPendingTests": 0,
  "numTodoTests": 0,
  "snapshot": {
    "total": 16,
    "matched": 16,
    "unmatched": 0,
    "added": 0,
    "updated": 0,
    "failure": false
  }
}
```

All 32 tests passed, with no skipped or todo tests, and all 16 snapshots matched. `added: 0` and `updated: 0` show that snapshots were not added or updated to make this run pass.

For individual tests, inspect `assertionResults` inside `testResults`. Key fields are `fullName` (test identity), `status` (result), and `failureMessages` (failure details).

### coverage-summary.json: code coverage

The four main metrics from `total` in `1-baseline/coverage/coverage-summary.json`:

```json
{
  "total": {
    "lines": {
      "total": 64,
      "covered": 64,
      "skipped": 0,
      "pct": 100
    },
    "statements": {
      "total": 96,
      "covered": 96,
      "skipped": 0,
      "pct": 100
    },
    "functions": {
      "total": 64,
      "covered": 64,
      "skipped": 0,
      "pct": 100
    },
    "branches": {
      "total": 64,
      "covered": 48,
      "skipped": 0,
      "pct": 75
    }
  }
}
```

`total` is the number of coverage items, `covered` is the number exercised, and `pct` is the percentage. For example, 48 of 64 branches were covered, giving 75%. Lines, statements, and functions reach 100%, while branches reach 75%, meeting the configured thresholds.

The actual file also contains per-source-file entries. High coverage alone does not establish that the implementation is free of defects.

### stdout.txt / stderr.txt: execution diagnostics

`stdout.txt` contains Vitest test listings and summaries. `stderr.txt` can contain warnings, errors, and CPU timing information. Output and color-control sequences vary by environment.

**A nonempty `stderr.txt` does not by itself indicate failure.** Start with `valid` and `reasons` in `record.json`, then inspect the relevant run's logs.

## 4. Stopping before measurement

This illustrative example shows a Node.js version mismatch. It is not a performance measurement:

```json
{
  "output": "/path/to/vitest-ci-practice/artifacts/measure-example",
  "complete": false,
  "validCount": 0,
  "invalidCount": 0,
  "fatalReasons": [
    "condition_mismatch: Node v24.21.0; expected v24.19.0"
  ],
  "comparison": null
}
```

`validCount: 0` and `invalidCount: 0` mean no measurement started, not that all six runs failed. Inspect `fatalReasons` and any available `preflight` details in `summary.json`.

| Reason | What to check |
|---|---|
| `condition_mismatch: Node ...` | Whether Node.js is exactly 24.19.0 |
| `condition_mismatch: platform/architecture` | Whether execution is on Linux x64 |
| `environment_error: npm version unavailable` | Whether the process can launch npm |
| `condition_mismatch: changed ...` | Whether the named file's contents changed |

Native Windows execution of `measure` is unsupported. Use Linux, such as WSL2 with the required Node.js/npm versions, or GitHub Actions. LF/CRLF compatibility does not imply native Windows measurement support.

After measurement starts, invalid run reasons are saved in `summary.json` under `records` and in each `record.json`. No comparison is produced unless all six runs are valid.

| Example reason | Meaning |
|---|---|
| `missing_test_json` | No test report was produced for this run |
| `stale_or_invalid_test_json: ...` | The report timestamp is outside this process's execution interval |
| `test_id_mismatch` | Reported tests differ from the required identities |
| `snapshot_mismatch` | Snapshot preservation conditions were not met |
| `missing_coverage_summary` | Coverage summary is missing |
| `missing_cpu_timing` | CPU timing could not be obtained |

Do not replace missing values with zero or discard invalid runs to compare only successful samples.

## 5. Defect detection: failure-check

`npm run failure-check` separately checks healthy execution, a known implementation defect, and a deliberate environment error for both variants. Results are saved under `artifacts/failure-*/`.

The console summarizes `passed`, `directory`, `reasons`, case classifications, and `restored`. The `failure-check.json` file includes the expected defect, all six cases, and per-file restoration details. This excerpt shows only one case; the actual `records` array contains six:

```json
{
  "passed": true,
  "reasons": [],
  "records": [
    {
      "variant": "baseline",
      "scenario": "implementation_fault",
      "expectedClassification": "implementation_fault_detected",
      "exitCode": 1,
      "classification": "implementation_fault_detected",
      "expectedFailureDetected": true,
      "targetTestId": "feature-01 round-trips a catalogue key",
      "passed": true
    }
  ]
}
```

Here, `exitCode: 1` is expected because the test detected the deliberately injected defect. The target test failed with expected value 137 and actual value 138, so the validation case itself has `passed: true`.

The environment-error case has `classification: environment_error` and `expectedFailureDetected: false`. Its case can still pass when the intended startup error is verified. Arbitrary startup failures are not treated as successful defect detection.

Case-specific `record.json`, `vitest.json`, `stdout.txt`, and `stderr.txt` are stored under paths such as `baseline/implementation_fault/`. No `vitest.json` is expected for the deliberately unstartable environment-error case. `implementation-fault.patch` records the injected change, and `restoration` in `failure-check.json` records the checks after restoring the original files.

See [CI instructions](ci-workflow.md) for artifact locations on GitHub Actions. Generated files contain environment paths; share only the relevant excerpts.
