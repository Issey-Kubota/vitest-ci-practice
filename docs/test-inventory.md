# Tests and fixed references

The sample uses `tests/feature-01.test.ts` through `tests/feature-16.test.ts`. Each file contains two tests.

| Test | Assertions | Snapshots | Purpose |
|---|---:|---:|---|
| `feature-NN > round-trips a catalogue key` | 2 | 1 | Check key generation and reverse lookup |
| `feature-NN > returns -1 for an unknown key` | 1 | 0 | Check the sentinel value for unknown keys |

There are 32 tests, 48 assertions, and 16 inline snapshots in total. The baseline imports through the barrel; the candidate imports the target module directly.

## Required reference files

`reference/` contains the fixed inputs used by the validators, not historical execution results.

- `baseline-tests.json`: full baseline test contents and the permitted import substitutions. `verify:manifest` checks the file inventory and full contents, detecting changed expectations, snapshots, test IDs, and added or missing files.
- `measurement-conditions.json`: Node.js/dependency versions and hashes of source, configuration, and lockfiles. `measure` uses these to verify consistent conditions.

The scripts also verify the reference JSON hashes themselves. Do not edit or regenerate the references during normal execution. Provenance identifiers in the JSON are part of the fixed references; you do not need to obtain historical archives or logs.

## Validation versus restoration

`verify:manifest` is read-only. It checks whether the current tests consistently match an allowed baseline or candidate variant. It does not save the previous state or compare before/after execution.

`measure` saves the starting test contents in memory, restores them after execution, and verifies byte-for-byte equality. Inspect `restoration.restored` in `summary.json`. The subsequent `verify:manifest` independently checks the restored tests against the fixed reference.

If forced termination prevents cleanup, inspect the working-tree changes before running again.

## Line endings

Reference, test, and protected-input comparisons normalize CRLF to LF. Differences in whitespace, expectations, code, and all other bytes are still detected. Validation does not rewrite files. Restoration preserves the original bytes, including line endings. Comparison hashes are computed from LF-normalized contents.

`.gitattributes` requests LF for Git checkouts. The validators also accept CRLF files left in older working copies.

This is separate from native Windows measurement support. `measure` requires Linux x64. On Windows, use a Linux environment such as WSL2 with the specified Node.js/npm versions.
