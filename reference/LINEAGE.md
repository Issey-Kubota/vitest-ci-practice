# Fixed test baseline lineage

Source archive: `original-delivery.zip` (the delivered `p29-vitest-example.zip`).

Archive SHA-256: `d629f965fa81a959d5de08895b7f876f9468e58bdc0be962c99c60f30996b8b0`.

`baseline-tests.json` SHA-256: `63dc0df35db8f7fbffcc925b6d274dc564a6a8fbe26759607ac6be05c11f841e`. This digest is pinned in `scripts/verify-manifest.mjs`.

The archive contains candidate test imports. The reference reconstructs the baseline by replacing exactly one designated import in each of the 16 test files with `../src/features/index.js`. All other bytes, including assertions, test titles and inline snapshots, are retained. Each original archive member digest is recorded. This is a reconstruction from preserved original artifacts, not a newly measured baseline.

Verification only reads this reference. It never generates or overwrites it or `results/test-manifest.json`. A changed reference fails its pinned digest check. Revisions to this reference require a separately reviewed change to the reference and its pinned digest; the verifier is not a tamper-proof signing system.

The only accepted test states are all-baseline imports or all-candidate imports; mixed states, missing or extra test-tree files, and every other content change are invalid. This comparison protects this fixed fixture's tests, not arbitrary projects. It does not assert the quality of all tests or approve an implementation change. Source/configuration/environment checks are separate measurement conditions.
