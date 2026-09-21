import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyRun, TARGET_ID, UNKNOWN_ID } from './failure-check.mjs'

// Synthetic reporter fixtures test the checker, not application performance.
function fixture(fault = false) {
  return {
    code: fault ? 1 : 0, signal: null, spawnError: null,
    startedMs: 1000, endedMs: 2000, reportError: null, output: '',
    report: {
      startTime: 1500, success: !fault,
      numTotalTests: 2, numPassedTests: fault ? 1 : 2, numFailedTests: fault ? 1 : 0, numPendingTests: 0, numTodoTests: 0,
      snapshot: { total: 1, matched: 1, failure: false, added: 0, updated: 0, unmatched: 0 },
      testResults: [{ name: '/example/tests/feature-01.test.ts', status: fault ? 'failed' : 'passed', assertionResults: [
        { fullName: TARGET_ID, status: fault ? 'failed' : 'passed', failureMessages: fault ? ['AssertionError: expected 138 to be 137 // Object.is equality\n at feature-01.test.ts:8:27'] : [] },
        { fullName: UNKNOWN_ID, status: 'passed', failureMessages: [] }
      ] }]
    }
  }
}

test('healthy and exact implementation fault are distinct', () => {
  assert.equal(classifyRun(fixture()).classification, 'healthy')
  assert.equal(classifyRun(fixture()).expectedFailureDetected, false)
  assert.equal(classifyRun(fixture(true)).classification, 'implementation_fault_detected')
  assert.equal(classifyRun(fixture(true)).expectedFailureDetected, true)
})

test('missing report and startup error do not count as fault detection', () => {
  const run = fixture(true)
  run.report = null
  run.reportError = 'fresh_report_missing'
  run.output = "Error: Cannot find module '/deliberately-missing-vitest.mjs'"
  assert.equal(classifyRun(run).classification, 'environment_error')
  assert.equal(classifyRun(run).expectedFailureDetected, false)
  run.spawnError = 'ENOENT: spawn /missing/node ENOENT'
  assert.equal(classifyRun(run).expectedFailureDetected, false)
})

test('a stale valid-looking report cannot prove a fault was detected this time', () => {
  const run = fixture(true)
  run.report.startTime = 999
  assert.equal(classifyRun(run).classification, 'environment_error')
  assert.equal(classifyRun(run).expectedFailureDetected, false)
})

test('wrong test ID, changed expectation, and wrong failure message are rejected', () => {
  const wrongId = fixture(true)
  wrongId.report.testResults[0].assertionResults[0].fullName = 'some different test'
  assert.equal(classifyRun(wrongId).expectedFailureDetected, false)
  const changedExpected = fixture(true)
  changedExpected.report.testResults[0].assertionResults[0].failureMessages = ['AssertionError: expected 137 to be 138 // Object.is equality']
  assert.equal(classifyRun(changedExpected).classification, 'unexpected_test_failure')
  assert.equal(classifyRun(changedExpected).expectedFailureDetected, false)
  const wrongError = fixture(true)
  wrongError.report.testResults[0].assertionResults[0].failureMessages = ['ReferenceError: lookup01 is not defined']
  assert.equal(classifyRun(wrongError).expectedFailureDetected, false)
})

test('signal, mixed runtime error, extra assertion failure, and broken snapshot are rejected', () => {
  for (const modify of [
    run => { run.signal = 'SIGTERM' },
    run => { run.output = 'Vitest caught 1 unhandled error: Unhandled Rejection' },
    run => { run.report.testResults[0].assertionResults[1].status = 'failed' },
    run => { run.report.snapshot.matched = 0 },
    run => { run.report.numFailedTests = 2 }
  ]) {
    const run = fixture(true)
    modify(run)
    assert.equal(classifyRun(run).expectedFailureDetected, false)
  }
})

test('exit 1 with passing assertions is not a known implementation failure', () => {
  const run = fixture()
  run.code = 1
  assert.equal(classifyRun(run).classification, 'unexpected_test_failure')
  assert.equal(classifyRun(run).expectedFailureDetected, false)
})

test('malformed reporter structures are invalid rather than fault detection', () => {
  for (const modify of [
    run => { run.report.testResults = [null] },
    run => { run.report.testResults[0].name = 123 },
    run => { run.report.testResults[0].assertionResults[0].failureMessages = [null] },
    run => { run.report.numTotalTests = '2' }
  ]) {
    const run = fixture(true)
    modify(run)
    assert.equal(classifyRun(run).classification, 'environment_error')
    assert.equal(classifyRun(run).expectedFailureDetected, false)
  }
})
