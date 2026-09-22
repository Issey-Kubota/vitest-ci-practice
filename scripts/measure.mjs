import { normalizeTextBytes } from './normalize-text.mjs'
// Measure this fixed sample using Vitest reports and process-level timing.
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { spawn, execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join, relative } from 'node:path'
import os from 'node:os'
import { verifyManifest } from './verify-manifest.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CONDITIONS_HASH = 'd5f6bde80f15b39d82623e15ceb1902226c3fa17dce636b83c5f9affcc31aa36'
const ORDER = ['baseline', 'candidate', 'baseline', 'candidate', 'baseline', 'candidate']
/**
 * Fingerprint a protected text input after CRLF normalization.
 * @param {string | Buffer} data - Input bytes or text.
 * @returns {string} Hexadecimal SHA-256 digest of LF-normalized bytes.
 */
const sha256 = data => createHash('sha256').update(normalizeTextBytes(data)).digest('hex')
/**
 * Select the middle value; callers supply three samples per variant.
 * @param {number[]} xs - Nonempty odd-length sample set; the input is not mutated.
 * @returns {number} Middle sorted value (upper middle for even-length input).
 */
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

/**
 * Collect a child process result, preserving startup errors and termination signals.
 * @param {string} command - Executable to launch.
 * @param {string[]} args - Executable arguments.
 * @param {import("node:child_process").SpawnOptions} options - Working directory and environment; stdout/stderr must be piped.
 * @returns {Promise<object>} Exit status, signal, error, output, epoch timestamps and monotonic wall time in ms.
 */
export async function runProcess(command, args, options) {
  const startedAt = Date.now(), started = performance.now()
  return new Promise(resolve => {
    let stdout = '', stderr = '', spawnError = null
    const child = spawn(command, args, options)
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', error => { spawnError = `${error.code ?? error.name}: ${error.message}` })
    child.on('close', (code, signal) => resolve({ code, signal, spawnError, stdout, stderr, startedAt, endedAt: Date.now(), wallMs: performance.now() - started }))
  })
}

/**
 * List all source paths recursively for exact inventory matching.
 * @param {string} path - Directory to inspect.
 * @param {string} prefix - Relative prefix; defaults to empty.
 * @returns {Promise<string[]>} Sorted relative paths.
 */
async function fileSet(path, prefix = '') {
  const files = []
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = prefix + entry.name
    if (entry.isDirectory()) files.push(...await fileSet(join(path, entry.name), name + '/'))
    else files.push(name)
  }
  return files.sort()
}

/**
 * Check runtime versions, protected bytes, source inventory and test variant.
 * @param {string} root - Sample root directory.
 * @param {object} fixed - Pinned measurement conditions.
 * @param {string | null} variant - Required import variant, or null to accept either consistent variant.
 * @returns {Promise<object>} Validity, reasons, observed environment and manifest result.
 */
export async function checkConditions(root, fixed, variant = null) {
  const reasons = [], observed = { node: process.version, platform: process.platform, arch: process.arch, packages: {} }
  if (observed.node !== fixed.versions.node) reasons.push(`condition_mismatch: Node ${observed.node}; expected ${fixed.versions.node}`)
  if (observed.platform !== fixed.platform || observed.arch !== fixed.arch) reasons.push('condition_mismatch: platform/architecture')
  try {
    observed.npm = execFileSync('npm', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
    if (observed.npm !== fixed.versions.npm) reasons.push(`condition_mismatch: npm ${observed.npm}`)
  } catch (e) { reasons.push(`environment_error: npm version unavailable: ${e.code ?? e.message}`) }
  for (const name of ['vitest', 'vite', 'typescript', '@vitest/coverage-v8']) {
    try {
      observed.packages[name] = JSON.parse(await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8')).version
      if (observed.packages[name] !== fixed.versions[name]) reasons.push(`condition_mismatch: ${name} ${observed.packages[name]}`)
    } catch (e) { reasons.push(`environment_error: ${name} unavailable: ${e.code ?? e.message}`) }
  }
  for (const [name, expected] of Object.entries(fixed.files)) {
    try { if (sha256(await readFile(join(root, name))) !== expected) reasons.push(`condition_mismatch: changed ${name}`) }
    catch (e) { reasons.push(`condition_mismatch: missing ${name}: ${e.code ?? e.message}`) }
  }
  try {
    const sources = (await fileSet(join(root, 'src'))).map(f => 'src/' + f)
    if (JSON.stringify(sources) !== JSON.stringify(Object.keys(fixed.files).filter(f => f.startsWith('src/')).sort())) reasons.push('condition_mismatch: source file set')
  } catch (e) { reasons.push(`condition_mismatch: source inventory: ${e.message}`) }
  const manifest = await verifyManifest(root)
  if (!manifest.valid) reasons.push(...manifest.reasons.map(r => `condition_mismatch: manifest ${r}`))
  if (variant && manifest.variant !== variant) reasons.push(`condition_mismatch: expected ${variant} imports, got ${manifest.variant}`)
  return { valid: reasons.length === 0, reasons, observed, manifest }
}

/**
 * Require fresh, complete test/coverage reports and usable timing before accepting a run.
 * @param {object} result - Process exit, output and timing record.
 * @param {object | null} json - Parsed Vitest report, or null when unavailable.
 * @param {object | null} coverage - Coverage summary, or null when unavailable.
 * @param {object} manifest - Manifest validity result.
 * @param {string} root - Root used to normalize reported file paths.
 * @returns {object} Validity, distinct rejection reasons, CPU milliseconds and Vitest duration text.
 */
export function validateOutputs(result, json, coverage, manifest, root) {
  const reasons = []
  if (result.spawnError) reasons.push(`startup_error: ${result.spawnError}`)
  if (result.signal) reasons.push(`process_signal: ${result.signal}`)
  if (result.code !== 0) reasons.push(`process_exit: ${result.code}`)
  if (!json) reasons.push('missing_test_json')
  else {
    // A successful old report must never stand in for output from this process.
    if (!Number.isFinite(json.startTime) || json.startTime < result.startedAt || json.startTime > result.endedAt) reasons.push('stale_or_invalid_test_json: startTime outside process interval')
    if (json.success !== true || json.numTotalTests !== 32 || json.numPassedTests !== 32 || json.numFailedTests !== 0 || json.numPendingTests !== 0 || json.numTodoTests !== 0) reasons.push('test_result_mismatch: expected 32 passed, zero failed/skipped/todo')
    const expected = Array.from({ length: 16 }, (_, i) => {
      const id = String(i + 1).padStart(2, '0')
      return [`tests/feature-${id}.test.ts|feature-${id} round-trips a catalogue key`, `tests/feature-${id}.test.ts|feature-${id} returns -1 for an unknown key`]
    }).flat().sort()
    // Compare exact file/test identities, not just the number of passing tests.
    const actual = []
    for (const suite of json.testResults ?? []) {
      if (suite.status !== 'passed' || suite.message) reasons.push('test_suite_error')
      for (const a of suite.assertionResults ?? []) {
        actual.push(`${relative(root, suite.name)}|${a.fullName}`)
        if (a.status !== 'passed' || a.failureMessages?.length) reasons.push(`test_status_error: ${a.fullName}`)
      }
    }
    if (JSON.stringify(actual.sort()) !== JSON.stringify(expected)) reasons.push('test_id_mismatch')
    const s = json.snapshot
    if (!s || s.total !== 16 || s.matched !== 16 || s.unmatched !== 0 || s.updated !== 0 || s.added !== 0 || s.failure) reasons.push('snapshot_mismatch')
  }
  if (!manifest.valid) reasons.push('manifest_invalid')
  if (!coverage) reasons.push('missing_coverage_summary')
  else {
    const expected = Array.from({ length: 16 }, (_, i) => `src/features/feature-${String(i + 1).padStart(2, '0')}.ts`).sort()
    const paths = Object.keys(coverage).filter(k => k !== 'total').map(k => relative(root, k)).sort()
    if (JSON.stringify(paths) !== JSON.stringify(expected)) reasons.push('coverage_target_mismatch')
    for (const [key, [total, covered, pct]] of Object.entries({ lines: [64, 64, 100], statements: [96, 96, 100], functions: [64, 64, 100], branches: [64, 48, 75] })) {
      const got = coverage.total?.[key]
      if (!got || got.total !== total || got.covered !== covered || got.pct !== pct || got.skipped !== 0) reasons.push(`coverage_result_mismatch: ${key}`)
    }
  }
  const match = result.stderr.match(/__P29_CPU_USER=([0-9.]+) __P29_CPU_SYSTEM=([0-9.]+)/)
  const totalRunnerCpuMs = match ? Math.round((Number(match[1]) + Number(match[2])) * 1000) : null
  const vitestDurationLine = result.stdout.match(/Duration\s+([^\n]+)/)?.[1]?.trim() ?? null
  if (totalRunnerCpuMs === null) reasons.push('missing_cpu_timing')
  if (!vitestDurationLine) reasons.push('missing_vitest_duration')
  return { valid: reasons.length === 0, reasons: [...new Set(reasons)], totalRunnerCpuMs, vitestDurationLine }
}

/**
 * Run six interleaved comparisons, preserve evidence and restore the original tests.
 * @param {string} root - Sample root; defaults to this repository.
 * @param {Function} runner - Async process runner; defaults to real execution and supports regression injection.
 * @returns {Promise<object>} Output directory, complete summary and exitCode (0 only for a valid restored batch).
 */
export async function measure(root = ROOT, runner = runProcess) {
  await mkdir(join(root, 'artifacts'), { recursive: true })
  const output = await mkdtemp(join(root, 'artifacts', 'measure-'))
  const summary = { schemaVersion: 2, helperVersion: 'p29-review-1', evidenceKind: runner === runProcess ? 'real-vitest-local' : 'regression-harness-not-performance', startedAt: new Date().toISOString(), records: [], validCount: 0, invalidCount: 0, comparison: null, complete: false, fatalReasons: [], restoration: null }
  const originalTests = new Map()
  try {
    const reference = await readFile(join(root, 'reference/measurement-conditions.json'))
    if (sha256(reference) !== CONDITIONS_HASH) throw new Error('condition_mismatch: fixed measurement reference changed')
    const fixed = JSON.parse(reference)
    summary.conditions = fixed
    summary.runner = { platform: process.platform, arch: process.arch, release: os.release(), cpuModel: os.cpus()[0]?.model ?? null, logicalCpuCount: os.cpus().length, availableParallelism: os.availableParallelism(), memoryBytes: os.totalmem(), localRunnerCount: 1, ciRunnerOccupancyMs: null }
    summary.cache = { clearedBeforeEveryRun: ['node_modules/.vite'], nodeCompileCache: 'disabled', osPageCache: 'not flushed', npmCache: 'outside measurement', processMode: 'new Vitest process each run' }
    const first = await checkConditions(root, fixed)
    summary.preflight = first
    if (!first.valid) throw new Error(first.reasons.join('; '))
    for (let i = 1; i <= 16; i++) {
      const name = `tests/feature-${String(i).padStart(2, '0')}.test.ts`
      originalTests.set(name, await readFile(join(root, name)))
    }
    // Interleave variants to limit ordering bias; retain every failed attempt.
    for (const [index, variant] of ORDER.entries()) {
      const runDirectory = join(output, `${index + 1}-${variant}`)
      await mkdir(runDirectory)
      const record = { sequence: index + 1, variant, attempt: Math.floor(index / 2) + 1, valid: false, reasons: [], wallMs: null, exitCode: null, jsonPresent: false, directory: relative(root, runDirectory) }
      summary.records.push(record)
      try {
        for (const [name, bytes] of originalTests) {
          const id = name.match(/feature-(\d{2})/)[1]
          await writeFile(join(root, name), bytes.toString('utf8').replace(/from '\.\.\/src\/features\/(?:index|feature-\d{2})\.js'/, `from '../src/features/${variant === 'baseline' ? 'index' : `feature-${id}`}.js'`))
        }
        const before = await checkConditions(root, fixed, variant)
        record.before = before
        if (!before.valid) { record.reasons.push(...before.reasons); continue }
        await rm(join(root, 'node_modules/.vite'), { recursive: true, force: true })
        const rawPath = join(runDirectory, 'vitest.json'), coverageDir = join(runDirectory, 'coverage')
        const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--coverage', `--coverage.reportsDirectory=${coverageDir}`, '--reporter=default', '--reporter=json', `--outputFile.json=${rawPath}`]
        const env = { ...process.env, CI: 'true', TZ: 'UTC', NODE_DISABLE_COMPILE_CACHE: '1', NODE_OPTIONS: '' }
        delete env.NODE_COMPILE_CACHE
        record.command = [process.execPath, ...args]
        // Bash time includes child CPU usage; wall time is measured separately.
        const result = await runner('bash', ['-c', 'TIMEFORMAT="__P29_CPU_USER=%U __P29_CPU_SYSTEM=%S"; time "$@"', 'p29-time', process.execPath, ...args], { cwd: root, env })
        record.process = { startedAt: result.startedAt, endedAt: result.endedAt, signal: result.signal, spawnError: result.spawnError }
        record.exitCode = result.code
        record.wallMs = Math.round(result.wallMs)
        await writeFile(join(runDirectory, 'stdout.txt'), result.stdout)
        await writeFile(join(runDirectory, 'stderr.txt'), result.stderr)
        let json = null, coverage = null
        try { json = JSON.parse(await readFile(rawPath, 'utf8')); record.jsonPresent = true }
        catch (e) { record.reasons.push(`test_json_unavailable: ${e.code ?? e.message}`) }
        try { coverage = JSON.parse(await readFile(join(coverageDir, 'coverage-summary.json'), 'utf8')) }
        catch (e) { record.reasons.push(`coverage_unavailable: ${e.code ?? e.message}`) }
        const after = await checkConditions(root, fixed, variant)
        record.after = after
        const checked = validateOutputs(result, json, coverage, after.manifest, root)
        record.reasons.push(...after.reasons, ...checked.reasons)
        record.reasons = [...new Set(record.reasons)]
        record.valid = record.reasons.length === 0
        record.totalRunnerCpuMs = checked.totalRunnerCpuMs
        record.vitestDurationLine = checked.vitestDurationLine
        record.testCounts = json ? { total: json.numTotalTests, passed: json.numPassedTests, failed: json.numFailedTests, skipped: json.numPendingTests, todo: json.numTodoTests } : null
        record.coverageTotals = coverage?.total ?? null
      } catch (e) { record.reasons.push(`measurement_error: ${e.code ?? e.message}`) }
      finally { await writeFile(join(runDirectory, 'record.json'), JSON.stringify(record, null, 2) + '\n') }
    }
  } catch (e) { summary.fatalReasons.push(e.message) }
  finally {
    // Restore saved bytes even after failures, then verify the restoration itself.
    try {
      for (const [name, bytes] of originalTests) await writeFile(join(root, name), bytes)
      for (const [name, bytes] of originalTests) if (!(await readFile(join(root, name))).equals(bytes)) throw new Error(`restoration mismatch: ${name}`)
      summary.restoration = { restored: true, files: originalTests.size }
    } catch (e) { summary.restoration = { restored: false, reason: e.message }; summary.fatalReasons.push(e.message) }
    summary.validCount = summary.records.filter(r => r.valid).length
    summary.invalidCount = summary.records.filter(r => !r.valid).length
    summary.complete = summary.validCount === 6 && summary.invalidCount === 0 && summary.fatalReasons.length === 0 && summary.restoration.restored
    // Simulated regression outputs must never produce a performance comparison.
    if (summary.complete && summary.evidenceKind === 'real-vitest-local') {
      summary.comparison = Object.fromEntries(['baseline', 'candidate'].map(variant => {
        const rows = summary.records.filter(r => r.valid && r.variant === variant)
        return [variant, { samples: rows.length, medianWallMs: median(rows.map(r => r.wallMs)), medianCpuMs: median(rows.map(r => r.totalRunnerCpuMs)) }]
      }))
    }
    summary.endedAt = new Date().toISOString()
    await writeFile(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
  }
  return { output, summary, exitCode: summary.complete ? 0 : 1 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { output, summary, exitCode } = await measure()
  console.log(JSON.stringify({ output, complete: summary.complete, validCount: summary.validCount, invalidCount: summary.invalidCount, fatalReasons: summary.fatalReasons, comparison: summary.comparison }, null, 2))
  process.exitCode = exitCode
}
