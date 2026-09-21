// Regression fixtures simulate output faults only. They are never performance observations.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, writeFile, symlink, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { measure, runProcess, validateOutputs } from './measure.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
await mkdir(join(root, 'artifacts'), { recursive: true })
const evidence = await mkdtemp(join(root, 'artifacts', 'measure-regression-'))
// Minimal reporter fixture: fixed stale timestamp, neutral paths, no measured timings.
const old = JSON.parse(await readFile(join(root, 'scripts/fixtures/vitest-success.json')))
const fixtureRoot = '/fixture'
// Synthetic coverage totals for validator tests; never performance evidence.
const cov = { total: { lines: { total:64, covered:64, pct:100, skipped:0 }, statements:{total:96,covered:96,pct:100,skipped:0}, functions:{total:64,covered:64,pct:100,skipped:0}, branches:{total:64,covered:48,pct:75,skipped:0} } }
for (let i = 1; i <= 16; i++) cov[`${fixtureRoot}/src/features/feature-${String(i).padStart(2, '0')}.ts`] = {}
const processResult = { code:0, signal:null, spawnError:null, startedAt:Date.now()-1, endedAt:Date.now()+1, stdout:'Duration 2.0s (import 50%)', stderr:'__P29_CPU_USER=1.0 __P29_CPU_SYSTEM=0.5', wallMs:2 }
const freshReport = () => ({ ...structuredClone(old), startTime:processResult.startedAt })
async function fixture(label) {
  const dir = await mkdtemp(join(tmpdir(), 'p29-measure-'))
  for (const name of ['scripts', 'reference', 'tests', 'src', 'package.json', 'package-lock.json', 'vitest.config.ts']) await cp(join(root,name),join(dir,name),{recursive:true})
  await mkdir(join(dir, 'results'))
  await writeFile(join(dir, 'results/baseline-1.json'), JSON.stringify(old))
  await symlink(join(root,'node_modules'),join(dir,'node_modules'))
  await writeFile(join(evidence,`${label}-fixture.txt`),dir+'\n')
  return dir
}
function brief(result) {
  return { exitCode:result.exitCode,summary:result.summary,output:result.output }
}
async function preserve(label,result) {
  await writeFile(join(evidence,label+'.json'),JSON.stringify(brief(result),null,2))
  await cp(result.output,join(evidence,label+'-outputs'),{recursive:true})
}

test('valid reporter fixture, fixed test IDs and coverage are accepted', () => {
  assert.equal(validateOutputs(processResult,freshReport(),cov,{valid:true},fixtureRoot).valid,true)
})
test('stale success JSON is rejected even with successful process exit', () => {
  const r = validateOutputs(processResult,old,cov,{valid:true},fixtureRoot)
  assert.equal(r.valid,false); assert.ok(r.reasons.some(x=>x.startsWith('stale_or_invalid')))
})
test('missing JSON, coverage, wrong test ID, bad exit or missing timing cannot pass', () => {
  for (const [name,p,j,c] of [
    ['json',processResult,null,cov],['coverage',processResult,freshReport(),null],
    ['exit',{...processResult,code:1},freshReport(),cov],['timing',{...processResult,stderr:''},freshReport(),cov],
    ['id',processResult,{...freshReport(),testResults:[]},cov]
  ]) assert.equal(validateOutputs(p,j,c,{valid:true},fixtureRoot).valid,false,name)
})
test('existing success files remain untouched when six fresh reports are missing', async () => {
  const dir = await fixture('missing-json')
  const before = await readFile(join(dir,'results/baseline-1.json'))
  const r = await measure(dir,async()=>({...processResult,startedAt:Date.now(),endedAt:Date.now()}))
  await preserve('missing-json',r)
  assert.equal(r.exitCode,1);assert.equal(r.summary.invalidCount,6);assert.equal(r.summary.validCount,0);assert.equal(r.summary.comparison,null)
  assert.ok(r.summary.records.every(x=>!x.jsonPresent && x.reasons.includes('missing_test_json')))
  assert.deepEqual(await readFile(join(dir,'results/baseline-1.json')),before)
  assert.equal(r.summary.restoration.restored,true)
})
test('spawn ENOENT is reasoned invalid, not a detected test failure', async () => {
  const result = await runProcess('/p29-intentionally-missing-command',[],{cwd:root,env:process.env})
  assert.match(result.spawnError,/ENOENT/)
  const dir = await fixture('startup-error')
  const r = await measure(dir,async()=>result)
  await preserve('startup-error',r)
  assert.equal(r.exitCode,1);assert.equal(r.summary.comparison,null)
  assert.ok(r.summary.records.every(x=>x.reasons.some(s=>s.startsWith('startup_error:'))))
})
test('configuration mismatch blocks execution before comparison', async () => {
  const dir = await fixture('config-mismatch')
  await writeFile(join(dir,'vitest.config.ts'),(await readFile(join(dir,'vitest.config.ts'),'utf8'))+'\n// deliberate mismatch\n')
  let invoked = false
  const r = await measure(dir,async()=>{invoked=true;return processResult})
  await preserve('condition-mismatch',r)
  assert.equal(invoked,false);assert.equal(r.exitCode,1);assert.equal(r.summary.comparison,null)
  assert.ok(r.summary.fatalReasons.some(s=>s.includes('changed vitest.config.ts')))
})
test('one missing run prevents comparison even when five runs otherwise validate', async () => {
  const dir = await fixture('partial-batch')
  let count = 0
  const r = await measure(dir,async(_command,args) => {
    count++
    const result = {...processResult,startedAt:Date.now(),endedAt:Date.now()}
    if (count === 3) return {...result,code:1}
    const report = structuredClone(old)
    report.startTime = result.startedAt
    for (const suite of report.testResults) suite.name = suite.name.replace(fixtureRoot,dir)
    const summary = Object.fromEntries(Object.entries(cov).map(([k,v])=>[k.replace(fixtureRoot,dir),v]))
    const raw = args.find(x=>x.startsWith('--outputFile.json=')).slice('--outputFile.json='.length)
    const coverageDir = args.find(x=>x.startsWith('--coverage.reportsDirectory=')).slice('--coverage.reportsDirectory='.length)
    await mkdir(coverageDir,{recursive:true})
    await writeFile(raw,JSON.stringify(report))
    await writeFile(join(coverageDir,'coverage-summary.json'),JSON.stringify(summary))
    return result
  })
  await preserve('partial-batch',r)
  assert.equal(r.exitCode,1);assert.equal(r.summary.complete,false)
  assert.equal(r.summary.validCount,5);assert.equal(r.summary.invalidCount,1);assert.equal(r.summary.comparison,null)
  assert.equal(r.summary.evidenceKind,'regression-harness-not-performance')
})
test('CLI exits nonzero when child exits zero but produces no new results', async () => {
  const dir = await fixture('cli-missing')
  await mkdir(join(dir,'bin'))
  await writeFile(join(dir,'bin/bash'),'#!/bin/sh\n# Regression stub, no Vitest execution\nexit 0\n')
  await chmod(join(dir,'bin/bash'),0o755)
  const r = await runProcess(process.execPath,['scripts/measure.mjs'],{cwd:dir,env:{...process.env,PATH:join(dir,'bin')+':'+process.env.PATH}})
  await writeFile(join(evidence,'cli-missing.json'),JSON.stringify(r,null,2))
  assert.equal(r.code,1)
  const out=JSON.parse(r.stdout);assert.equal(out.invalidCount,6);assert.equal(out.comparison,null)
  await cp(out.output,join(evidence,'cli-missing-outputs'),{recursive:true})
})
console.log(`Regression evidence: ${evidence}`)
