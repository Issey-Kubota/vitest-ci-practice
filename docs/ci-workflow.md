# Validation with GitHub Actions

## Starting a run

1. Fork the repository and enable GitHub Actions.
2. Select **Vitest validation** under Actions.
3. Choose **Run workflow** and select `main`.
4. Review the job logs and download its artifacts.

The workflow accepts manual `workflow_dispatch` events only. It does not run on pushes, pull requests, or a schedule. Other branches and reruns of an existing run are rejected; start a new run to try again.

## Execution conditions

The workflow uses Ubuntu 24.04 / Linux x64, a single job, and a 15-minute timeout. Versions are Node.js 24.19.0, npm 11.9.0, Vitest / coverage-v8 5.0.1, Vite 8.3.0, and TypeScript 5.9.2. Dependencies are restored with `npm ci`.

Official actions are pinned to commit SHAs. Permissions are limited to `contents: read`; checkout credentials are not persisted, and the workflow does not write back to the repository.

## Processing steps

1. Record the run ID, commit, and runner information; check out the target commit.
2. Save hashes of tracked files before execution.
3. Prepare Node.js/npm, install dependencies, and verify versions.
4. Run `verify:manifest` to check tests against the fixed reference.
5. Run `measure`: alternate baseline/candidate three times each, then restore the starting tests.
6. Run `failure-check`: check healthy execution, a known defect, and an environment error; restore source and tests.
7. Run helper regression tests, including simulated cases. These are not additional performance measurements.
8. Run `verify:manifest` again after restoration.
9. Compare tracked-file hashes and protected-file inventories, then upload newly generated output as an artifact.

Unexpected errors fail the job. Normal downstream steps are skipped after failure, while integrity recording and artifact upload are attempted regardless of the result. Runner loss or forced termination can prevent collection.

## Inspecting output

Artifacts are retained for 30 days. Download any results you need from the run page.

| File | What to inspect |
|---|---|
| `run-context.json` | Run ID, target commit, OS, CPU, memory, and cache conditions |
| `versions.json` | Expected and observed versions |
| `integrity.json` | Tracked-file integrity before and after execution |
| `new-artifacts/measure-*/summary.json` | Run validity, timings, comparison, and test restoration |
| `new-artifacts/failure-*/failure-check.json` | Defect detection and source/test restoration |
| Command logs | Error details and helper test results |

See [Output examples and interpretation](output-guide.md) for example contents.

## Measurement limitations

Actions dependency caching is disabled, and npm starts with an empty cache directory. Check the setup log to see whether Node.js came from the runner tool cache. Dependency installation is outside the measured intervals.

The Vite cache is cleared for each run and the Node compile cache is disabled. OS page caches and host load are not controlled. The same runner label does not guarantee identical hardware. CPU time is also distinct from runner occupancy and billable time.

The measurement helper uses the fixed label `evidenceKind: real-vitest-local` for actual child-process execution, including CI. Use `run-context.json` and the GitHub run page to establish where execution took place.
