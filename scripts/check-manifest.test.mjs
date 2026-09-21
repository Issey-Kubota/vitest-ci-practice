import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { verifyManifest } from './verify-manifest.mjs'

const source = fileURLToPath(new URL('..', import.meta.url))
const referenceBytes = await readFile(join(source, 'reference/baseline-tests.json'))
const reference = JSON.parse(referenceBytes)

async function fixture(t, variant = 'baseline') {
  const root = await mkdtemp(join(tmpdir(), 'p29-manifest-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'reference'))
  await mkdir(join(root, 'tests'))
  await copyFile(join(source, 'reference/baseline-tests.json'), join(root, 'reference/baseline-tests.json'))
  for (const entry of reference.files) {
    await writeFile(join(root, entry.path), variant === 'baseline' ? entry.baselineContent : entry.baselineContent.replace(entry.baselineImport, entry.candidateImport))
  }
  return root
}

for (const variant of ['baseline', 'candidate']) {
  test(`${variant}: exact allowed contents pass with 32 IDs, 48 assertions, 16 snapshots`, async t => {
    const root = await fixture(t, variant)
    const result = await verifyManifest(root)
    assert.equal(result.valid, true, JSON.stringify(result.reasons))
    assert.equal(result.variant, variant)
    assert.equal(result.testIds.length, 32)
    assert.equal(new Set(result.testIds).size, 32)
    assert.equal(result.assertions, 48)
    assert.equal(result.snapshots, 16)
    assert.deepEqual(await readFile(join(root, 'reference/baseline-tests.json')), referenceBytes)
  })
}

test('intentional expectation change is rejected and reference remains untouched', async t => {
  const root = await fixture(t, 'candidate')
  const path = join(root, 'tests/feature-01.test.ts')
  await writeFile(path, (await readFile(path, 'utf8')).replace('toBe(137)', 'toBe(138)'))
  const result = await verifyManifest(root)
  assert.equal(result.valid, false)
  assert.match(result.reasons.join('\n'), /unauthorized_test_change: tests\/feature-01/)
  assert.deepEqual(await readFile(join(root, 'reference/baseline-tests.json')), referenceBytes)
})

test('wrong direct import target is rejected', async t => {
  const root = await fixture(t, 'candidate')
  const path = join(root, 'tests/feature-01.test.ts')
  await writeFile(path, (await readFile(path, 'utf8')).replace("from '../src/features/feature-01.js'", "from '../src/features/feature-02.js'"))
  const result = await verifyManifest(root)
  assert.equal(result.valid, false)
  assert.match(result.reasons.join('\n'), /unauthorized_test_change/)
})

test('missing test file is rejected', async t => {
  const root = await fixture(t)
  await unlink(join(root, 'tests/feature-01.test.ts'))
  const result = await verifyManifest(root)
  assert.equal(result.valid, false)
  assert.match(result.reasons.join('\n'), /missing_test_file: tests\/feature-01/)
})

test('extra nested test file is rejected', async t => {
  const root = await fixture(t)
  await mkdir(join(root, 'tests/nested'))
  await writeFile(join(root, 'tests/nested/extra.test.ts'), "it.skip('extra', () => {})\n")
  const result = await verifyManifest(root)
  assert.equal(result.valid, false)
  assert.match(result.reasons.join('\n'), /unexpected_test_file: tests\/nested\/extra/)
})

test('mixed baseline and candidate imports are rejected', async t => {
  const root = await fixture(t)
  const entry = reference.files[0]
  await writeFile(join(root, entry.path), entry.baselineContent.replace(entry.baselineImport, entry.candidateImport))
  const result = await verifyManifest(root)
  assert.equal(result.valid, false)
  assert.match(result.reasons.join('\n'), /mixed_test_variants/)
})

test('changed baseline reference is rejected without rewriting it', async t => {
  const root = await fixture(t)
  const path = join(root, 'reference/baseline-tests.json')
  const modified = Buffer.concat([referenceBytes, Buffer.from(' ')])
  await writeFile(path, modified)
  const result = await verifyManifest(root)
  assert.equal(result.valid, false)
  assert.match(result.reasons.join('\n'), /reference_digest_mismatch/)
  assert.deepEqual(await readFile(path), modified)
})

test('CLI returns exit 0 for candidate and exit 1 for expectation change, preserving reference', async t => {
  const root = await fixture(t, 'candidate')
  await mkdir(join(root, 'scripts'))
  const script = join(root, 'scripts/verify-manifest.mjs')
  await copyFile(join(source, 'scripts/verify-manifest.mjs'), script)
  const before = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
  assert.equal(before.status, 0, before.stderr)
  assert.equal(JSON.parse(before.stdout).valid, true)
  const path = join(root, 'tests/feature-01.test.ts')
  await writeFile(path, (await readFile(path, 'utf8')).replace('toBe(137)', 'toBe(138)'))
  const after = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
  assert.equal(after.status, 1, after.stderr)
  assert.equal(JSON.parse(after.stdout).valid, false)
  assert.match(JSON.parse(after.stdout).reasons.join('\n'), /unauthorized_test_change/)
  assert.deepEqual(await readFile(join(root, 'reference/baseline-tests.json')), referenceBytes)
})
