# Compare Vitest worker limits

For TypeScript developers whose Vitest runs are slow, this experiment demonstrates how to compare concurrency settings in an existing environment. More workers can help independent, CPU-heavy test files; small files, process startup, coverage overhead, memory pressure and limited CPUs can offset that benefit. These are hypotheses to test, not guaranteed speedups.

## Run locally

Install a compatible Node release and run `npm ci`. Close competing workloads and run one experiment at a time in a clean checkout. Choose one import variant before starting (the default checkout uses candidate imports).

```bash
npm run verify:manifest
npm run measure:workers
npm run verify:manifest
```

Run `measure:workers` once. It automatically performs 15 fresh Vitest processes, five per maximum worker limit (1, 2, 4). The interleaved order is `1,2,4,2,4,1,4,1,2,1,4,2,4,2,1`. This spreads conditions across the batch but is not randomized or a statistical significance test. There are no excluded warmup runs.

The script passes `--maxWorkers` to the existing configuration. This is a concurrency ceiling, not proof that all workers are continuously busy. Import paths, test contents, isolation, forks pool, file parallelism and coverage settings remain fixed. Vite cache is cleared before each run; the OS page cache is not flushed. This measures the whole process with coverage enabled, not a coverage-free test run or an entire CI job.

## Read the result

A complete batch requires `complete: true`, `validCount: 15`, `invalidCount: 0` and no fatal reasons. `summary.json` is in the printed output directory. `comparison` contains `workers-1`, `workers-2` and `workers-4`, each with five samples, `medianWallMs`, `minWallMs`, `maxWallMs` and optional `medianCpuMs`. Each run has fresh reports, coverage, logs and validation details.

Compare the medians and inspect all individual runs and ranges. To describe a reduction from limit 1 to another limit, compute `(median1 - medianOther) / median1 * 100`. A negative result means slower execution. Do not select only successful fast runs: any rejected run prevents the batch comparison. CPU values are null in wall-only mode, including Windows. Runtime differences from the historical reference are warnings; changes during the batch or failed integrity checks reject the comparison.

No measured results are published for this experiment yet. A simulated regression batch verifies orchestration and validation only; it never produces performance comparisons. Keep results from different environments and commits separate. Record `git rev-parse HEAD`, hardware, environment and competing workloads with any shared result, without disclosing confidential data.

## Planned reference measurement and article

Proposed reference run: one Ubuntu 24.04 GitHub Actions job with pinned Node/npm, candidate imports, coverage enabled and all 15 measurements on the same runner. A new workflow and execution are pending review and authorization; no run is scheduled or started.

The article will explain the slow-test scenario, the maxWorkers setting, measured medians and ranges, conditions where increasing concurrency helps or hurts, and how readers can repeat the comparison in their own permitted environment. Test preservation is supporting evidence. This sample does not diagnose arbitrary projects, choose their optimal settings or modify their code automatically. No paid product is offered.
