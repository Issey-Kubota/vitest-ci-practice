import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { verifyManifest } from './verify-manifest.mjs'

export const TARGET_ID = 'feature-01 round-trips a catalogue key'
export const UNKNOWN_ID = 'feature-01 returns -1 for an unknown key'
const sourceLine = 'export function lookup01(value: string): number { return index.get(value) ?? -1 }'
const faultyLine = 'export function lookup01(value: string): number { const row = index.get(value); return row === undefined ? -1 : row + 1 }'
/**
 * Fingerprint bytes to verify exact restoration.
 * @param {Buffer} bytes - Original or restored file bytes.
 * @returns {string} Hexadecimal SHA-256 digest.
 */
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
/**
 * Remove ANSI color sequences before matching diagnostic text.
 * @param {string} text - Potentially colored output.
 * @returns {string} Text without supported ANSI color escapes.
 */
const plain = text => text.replace(/\u001b\[[0-9;]*m/g, '')

// This recognises one known implementation fault. Nonzero exit alone is never evidence.
/**
 * Distinguish healthy execution, the exact injected defect, environment errors and unrelated failures.
 * @param {object} run - Process and reporter evidence.
 * @param {number | null} run.code - Child exit code.
 * @param {string | null} run.signal - Termination signal.
 * @param {string | null} run.spawnError - Startup error.
 * @param {object | null} run.report - Parsed Vitest report.
 * @param {string | null} run.reportError - Report read/parse error.
 * @param {number} run.startedMs - Process start epoch milliseconds.
 * @param {number} run.endedMs - Process end epoch milliseconds.
 * @param {string} run.output - Combined output; defaults to empty.
 * @returns {object} Classification, detection flag, reasons and available target failure details.
 */
export function classifyRun({ code, signal, spawnError, report, reportError, startedMs, endedMs, output = '' }) {
  const reasons = []
  if (spawnError) reasons.push(`spawn_error: ${spawnError}`)
  if (signal) reasons.push(`terminated_by_signal: ${signal}`)
  if (reportError) reasons.push(reportError)
  if (!report || typeof report !== 'object' || !Array.isArray(report.testResults)) reasons.push('missing_or_invalid_report')
  if (reasons.length) return { classification: 'environment_error', expectedFailureDetected: false, reasons }
  // Validate the report shape before trusting nested test and failure fields.
  const validSchema = typeof report.success === 'boolean' && ['numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests'].every(key => Number.isInteger(report[key]) && report[key] >= 0) && report.testResults.every(result => result && typeof result.name === 'string' && Array.isArray(result.assertionResults) && result.assertionResults.every(test => test && typeof test.fullName === 'string' && Array.isArray(test.failureMessages) && test.failureMessages.every(message => typeof message === 'string')))
  if (!validSchema) return { classification: 'environment_error', expectedFailureDetected: false, reasons: ['invalid_report_schema'] }
  if (!Number.isFinite(report.startTime) || report.startTime < startedMs || report.startTime > endedMs) reasons.push('report_start_time_outside_this_run')
  if (report.testResults.length !== 1 || !report.testResults[0].name?.replaceAll('\\', '/').endsWith('/tests/feature-01.test.ts')) reasons.push('unexpected_test_file')
  if (report.numTotalTests !== 2 || report.numPendingTests !== 0 || report.numTodoTests !== 0) reasons.push('unexpected_test_counts')
  if (report.numRuntimeErrorTestSuites > 0 || (Array.isArray(report.unhandledErrors) && report.unhandledErrors.length > 0)) reasons.push('runtime_errors_in_report')
  if (/Unhandled (?:Errors?|Rejection|Exception)|uncaughtException|ERR_MODULE_NOT_FOUND|Cannot find module/i.test(plain(output))) reasons.push('runtime_or_module_error_in_output')
  const assertions = report.testResults.flatMap(result => Array.isArray(result.assertionResults) ? result.assertionResults : [])
  if (assertions.length !== 2 || new Set(assertions.map(test => test.fullName)).size !== 2 || !assertions.some(test => test.fullName === TARGET_ID) || !assertions.some(test => test.fullName === UNKNOWN_ID)) reasons.push('unexpected_test_ids')
  if (assertions.some(test => !Array.isArray(test.failureMessages) || !['passed', 'failed'].includes(test.status))) reasons.push('invalid_assertion_status_or_messages')
  if (!report.snapshot || report.snapshot.total !== 1 || report.snapshot.matched !== 1 || report.snapshot.failure !== false || report.snapshot.added !== 0 || report.snapshot.updated !== 0 || report.snapshot.unmatched !== 0) reasons.push('snapshot_not_preserved')
  if (reasons.length) return { classification: 'environment_error', expectedFailureDetected: false, reasons }
  const target = assertions.find(test => test.fullName === TARGET_ID)
  const unknown = assertions.find(test => test.fullName === UNKNOWN_ID)
  const failureMessages = target.failureMessages.map(plain)
  const healthy = code === 0 && report.success === true && report.numFailedTests === 0 && report.numPassedTests === 2 && report.testResults[0].status === 'passed' && assertions.every(test => test.status === 'passed' && test.failureMessages.length === 0)
  if (healthy) return { classification: 'healthy', expectedFailureDetected: false, reasons: [], targetTestId: TARGET_ID, failureMessages: [] }
  // Only this exact assertion mismatch proves detection of the injected fault.
  const detected = code === 1 && report.success === false && report.numFailedTests === 1 && report.numPassedTests === 1 && report.testResults[0].status === 'failed' && target.status === 'failed' && unknown.status === 'passed' && unknown.failureMessages.length === 0 && failureMessages.length === 1 && /AssertionError: expected 138 to be 137 \/\/ Object\.is equality/.test(failureMessages[0])
  if (detected) return { classification: 'implementation_fault_detected', expectedFailureDetected: true, reasons: [], targetTestId: TARGET_ID, failureMessages }
  return { classification: 'unexpected_test_failure', expectedFailureDetected: false, reasons: ['exit_status_or_assertion_failure_did_not_match_the_known_fault'], targetTestId: TARGET_ID, failureMessages }
}

/**
 * Run the targeted test without coverage and persist raw output plus its classification.
 * @param {string} root - Sample working directory.
 * @param {string} directory - New case output directory.
 * @param {string} entry - Vitest entry path or deliberately missing path.
 * @returns {Promise<object>} Classified record and combined output.
 */
async function execute(root, directory, entry) {
  await mkdir(directory, { recursive: false })
  const reportPath = join(directory, 'vitest.json')
  const args = [entry, 'run', 'tests/feature-01.test.ts', '--config', 'vitest.config.ts', '--no-coverage', '--reporter=default', '--reporter=json', `--outputFile.json=${reportPath}`]
  const startedMs = Date.now()
  const begin = process.hrtime.bigint()
  const result = await new Promise(resolvePromise => {
    let stdout = '', stderr = '', spawnError = null
    const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, CI: 'true', NO_COLOR: '1' } })
    child.stdout?.on('data', data => { stdout += data })
    child.stderr?.on('data', data => { stderr += data })
    child.on('error', error => { spawnError = `${error.code ?? error.name}: ${error.message}` })
    child.on('close', (code, signal) => resolvePromise({ code, signal, spawnError, stdout, stderr }))
  })
  const elapsedSeconds = Number(process.hrtime.bigint() - begin) / 1e9
  const endedMs = Date.now()
  await writeFile(join(directory, 'stdout.txt'), result.stdout)
  await writeFile(join(directory, 'stderr.txt'), result.stderr)
  let report = null, reportError = null
  try { report = JSON.parse(await readFile(reportPath, 'utf8')) }
  catch (error) { reportError = error.code === 'ENOENT' ? 'fresh_report_missing' : `report_read_or_parse_error: ${error.message}` }
  const verdict = classifyRun({ ...result, report, reportError, startedMs, endedMs, output: result.stdout + result.stderr })
  const record = { command: [process.execPath, ...args], startedAt: new Date(startedMs).toISOString(), endedAt: new Date(endedMs).toISOString(), elapsedSeconds, exitCode: result.code, signal: result.signal, spawnError: result.spawnError, reportError, ...verdict }
  await writeFile(join(directory, 'record.json'), JSON.stringify(record, null, 2) + '\n')
  return { record, output: result.stdout + result.stderr }
}

/**
 * Exercise healthy, faulty and missing-runner cases for both import variants, then restore files.
 * @param {string} root - Sample directory, resolved before execution.
 * @returns {Promise<object>} Case records, version checks, failure reasons and byte-restoration results.
 */
export async function runFailureCheck(root) {
  root = resolve(root)
  const directory = join(root, 'artifacts', `failure-${randomUUID()}`)
  await mkdir(directory, { recursive: true })
  const summary = { startedAt: new Date().toISOString(), directory, coverage: 'disabled only for this targeted fault check; excluded from performance comparisons', expectedFault: { sourceFile: 'src/features/feature-01.ts', original: sourceLine, mutation: faultyLine, targetTestId: TARGET_ID, unchangedExpected: 137, faultyActual: 138, unknownKeyExpected: -1 }, records: [], reasons: [], restoration: [], passed: false }
  const originals = new Map()
  try {
    const precheck = await verifyManifest(root)
    summary.precheck = precheck
    if (!precheck.valid) throw new Error(`manifest_precheck_failed: ${precheck.reasons.join('; ')}`)
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    const vitest = JSON.parse(await readFile(join(root, 'node_modules/vitest/package.json'), 'utf8'))
    summary.versions = { node: process.versions.node, vitest: vitest.version, expectedNode: pkg.engines.node, expectedVitest: pkg.devDependencies.vitest }
    if (process.versions.node !== pkg.engines.node || vitest.version !== pkg.devDependencies.vitest) throw new Error('fixed_environment_version_mismatch')
    const sourcePath = join(root, 'src/features/feature-01.ts')
    originals.set(sourcePath, await readFile(sourcePath))
    const originalSource = originals.get(sourcePath).toString('utf8')
    if (originalSource.split(sourceLine).length !== 2) throw new Error('known_implementation_line_missing_or_duplicated')
    const tests = (await readdir(join(root, 'tests'))).filter(name => /^feature-\d{2}\.test\.ts$/.test(name)).sort()
    for (const name of tests) originals.set(join(root, 'tests', name), await readFile(join(root, 'tests', name)))
    await writeFile(join(directory, 'implementation-fault.patch'), `--- a/src/features/feature-01.ts\n+++ b/src/features/feature-01.ts\n@@ -14 +14 @@\n-${sourceLine}\n+${faultyLine}\n`)
    // Keep expectations intact: inject a source defect, then restore between cases.
    for (const variant of ['baseline', 'candidate']) {
      const variantDirectory = join(directory, variant)
      await mkdir(variantDirectory)
      for (const name of tests) {
        const path = join(root, 'tests', name)
        const target = variant === 'baseline' ? 'index' : name.replace('.test.ts', '')
        await writeFile(path, originals.get(path).toString('utf8').replace(/from '\.\.\/src\/features\/(?:index|feature-\d{2})\.js'/, `from '../src/features/${target}.js'`))
      }
      const manifest = await verifyManifest(root)
      await writeFile(join(variantDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
      if (!manifest.valid) throw new Error(`variant_manifest_failed: ${variant}: ${manifest.reasons.join('; ')}`)
      for (const scenario of ['healthy', 'implementation_fault', 'environment_error']) {
        await writeFile(sourcePath, scenario === 'implementation_fault' ? originalSource.replace(sourceLine, faultyLine) : originals.get(sourcePath))
        const caseDirectory = join(variantDirectory, scenario)
        // The missing entry path is fresh and local. No external environment is changed.
        const entry = scenario === 'environment_error' ? join(caseDirectory, 'deliberately-missing-vitest.mjs') : join(root, 'node_modules/vitest/vitest.mjs')
        const { record, output } = await execute(root, caseDirectory, entry)
        const expectedClassification = scenario === 'healthy' ? 'healthy' : scenario === 'implementation_fault' ? 'implementation_fault_detected' : 'environment_error'
        const controlledEnvironmentError = scenario !== 'environment_error' || (record.reportError === 'fresh_report_missing' && record.exitCode === 1 && /MODULE_NOT_FOUND/.test(output) && output.includes(entry))
        summary.records.push({ variant, scenario, expectedClassification, ...record, passed: record.classification === expectedClassification && controlledEnvironmentError })
      }
    }
  } catch (error) {
    summary.reasons.push(`${error.code ?? error.name}: ${error.message}`)
  } finally {
    // Cleanup must restore both source and tests, including on partial failure.
    for (const [path, bytes] of originals) {
      try {
        await writeFile(path, bytes)
        const restored = await readFile(path)
        summary.restoration.push({ file: path.slice(root.length + 1), beforeSha256: hash(bytes), afterSha256: hash(restored), restored: bytes.equals(restored) })
      } catch (error) {
        summary.restoration.push({ file: path.slice(root.length + 1), restored: false, reason: error.message })
      }
    }
  }
  summary.endedAt = new Date().toISOString()
  summary.childWaitSeconds = summary.records.reduce((sum, record) => sum + record.elapsedSeconds, 0)
  summary.passed = summary.reasons.length === 0 && summary.records.length === 6 && summary.records.every(record => record.passed) && summary.restoration.length > 0 && summary.restoration.every(record => record.restored)
  await writeFile(join(directory, 'failure-check.json'), JSON.stringify(summary, null, 2) + '\n')
  return summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const summary = await runFailureCheck(dirname(dirname(fileURLToPath(import.meta.url))))
    console.log(JSON.stringify({ passed: summary.passed, directory: summary.directory, reasons: summary.reasons, records: summary.records.map(({ variant, scenario, classification, passed }) => ({ variant, scenario, classification, passed })), restored: summary.restoration.every(record => record.restored) }, null, 2))
    process.exitCode = summary.passed ? 0 : 1
  } catch (error) {
    console.error(`failure_check_failed: ${error.message}`)
    process.exitCode = 1
  }
}
