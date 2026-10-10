// Exercise portability without claiming measurements on simulated operating systems.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkEnvironment, measurementCommand, selectTiming, supportsNode } from './environment.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const fixed = JSON.parse(await readFile(join(root, 'reference/measurement-conditions.json'), 'utf8'))
const windows = { node: 'v24.21.0', platform: 'win32', arch: 'arm64', execPath: process.execPath, env: { npm_config_user_agent: 'npm/11.10.0 node/v24.21.0 win32 arm64' } }

test('supported Node families accept patch differences but reject incompatible releases', () => {
  for (const version of ['v22.12.0', '22.20.1', 'v24.0.0', 'v24.21.0', 'v26.0.0', 'v28.0.0']) assert.equal(supportsNode(version), true, version)
  for (const version of ['v20.19.0', 'v22.11.0', 'v23.1.0', 'v25.0.0', 'v24.0.0-rc.1', 'unknown']) assert.equal(supportsNode(version), false, version)
})

test('OS, architecture, Node patch and npm differences warn without blocking', async () => {
  const result = await checkEnvironment(root, fixed, windows)
  assert.equal(result.valid, true)
  assert.equal(result.observed.npm, '11.10.0')
  assert.equal(result.observed.platform, 'win32')
  assert.ok(result.warnings.some(warning => warning.includes('Node v24.21.0')))
  assert.ok(result.warnings.some(warning => warning.includes('win32/arm64')))
})

test('missing npm metadata is nonfatal when Vitest can run directly through Node', async () => {
  const result = await checkEnvironment(root, fixed, { ...windows, env: {} })
  assert.equal(result.valid, true)
  assert.equal(result.observed.npm, null)
  assert.ok(result.warnings.some(warning => warning.startsWith('npm_version_unavailable')))
})

test('unsupported Node versions stop preflight with an actionable compatibility reason', async () => {
  const result = await checkEnvironment(root, fixed, { ...windows, node: 'v22.11.0' })
  assert.equal(result.valid, false)
  assert.ok(result.reasons.some(reason => reason.startsWith('unsupported_runtime:')))
})

test('missing dependencies and a mismatched coverage provider remain blocking errors', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vitest-environment-'))
  try {
    for (const name of ['vitest', 'vite', 'typescript', '@vitest/coverage-v8']) {
      await mkdir(join(dir, 'node_modules', name), { recursive: true })
      await cp(join(root, 'node_modules', name, 'package.json'), join(dir, 'node_modules', name, 'package.json'))
    }
    await writeFile(join(dir, 'node_modules/@vitest/coverage-v8/package.json'), JSON.stringify({ version: '5.0.2' }))
    const mismatch = await checkEnvironment(dir, fixed, windows)
    assert.equal(mismatch.valid, false)
    assert.ok(mismatch.reasons.some(reason => reason.startsWith('incompatible_dependencies:')))
    await rm(join(dir, 'node_modules/vitest/package.json'))
    const missing = await checkEnvironment(dir, fixed, windows)
    assert.ok(missing.reasons.some(reason => reason.startsWith('environment_error: vitest unavailable')))
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('Windows does not invoke Bash and preserves executable paths and arguments with spaces', () => {
  const timing = selectTiming('win32', () => { throw new Error('must not probe Bash') })
  const args = ['C:\\sample with spaces\\vitest.mjs', '--outputFile.json=C:\\sample with spaces\\result.json']
  assert.deepEqual(measurementCommand(args, timing, 'C:\\Program Files\\nodejs\\node.exe'), { command: 'C:\\Program Files\\nodejs\\node.exe', args })
  assert.equal(timing.cpuAvailable, false)
})

test('Bash discovery failure selects wall-only timing instead of blocking measurement', () => {
  assert.equal(selectTiming('darwin', () => { throw new Error('ENOENT') }).mode, 'wall-only')
  assert.equal(selectTiming('linux', () => {}).mode, 'bash-time')
})
