// Compare worker limits while preserving the current import variant and test contents.
import { measure } from './measure.mjs'

const { output, summary, exitCode } = await measure(undefined, undefined, { experiment: 'workers' })
console.log(JSON.stringify({ output, experiment: summary.experiment, complete: summary.complete, validCount: summary.validCount, invalidCount: summary.invalidCount, fatalReasons: summary.fatalReasons, warnings: summary.warnings, timing: summary.timing, comparison: summary.comparison }, null, 2))
process.exitCode = exitCode
