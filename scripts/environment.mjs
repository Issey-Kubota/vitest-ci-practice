// Separate runtime compatibility from the environment used for historical measurements.
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const NODE_RANGE = '^22.12.0 || ^24.0.0 || >=26.0.0'

/**
 * Match the Node release families supported by the bundled Vitest dependency.
 * @param {string} version - Node version, with an optional leading v.
 * @returns {boolean} Whether the stable version is in NODE_RANGE.
 */
export function supportsNode(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) return false
  const major = Number(match[1]), minor = Number(match[2])
  return (major === 22 && minor >= 12) || major === 24 || major >= 26
}

/**
 * Read npm metadata without requiring a Windows command shim to be executable.
 * @param {object} runtime - Runtime details and environment variables.
 * @returns {string | null} npm version, or null when discovery is unavailable.
 */
export function npmVersion(runtime) {
  const agent = runtime.env.npm_config_user_agent?.match(/(?:^|\s)npm\/([^\s]+)/)
  if (agent) return agent[1]
  try {
    if (runtime.env.npm_execpath) return execFileSync(runtime.execPath, [runtime.env.npm_execpath, '--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 }).trim()
    if (runtime.platform !== 'win32') return execFileSync('npm', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 }).trim()
  } catch { /* Missing npm metadata does not prevent direct Node execution of Vitest. */ }
  return null
}

/**
 * Record runtime versions; only incompatible runtimes or missing dependencies block execution.
 * @param {string} root - Sample directory with installed dependencies.
 * @param {object} fixed - Historical environment recorded in the fixed reference.
 * @param {object} runtime - Injectable runtime details for cross-platform regression tests.
 * @returns {Promise<object>} Observed environment, blocking reasons and nonblocking warnings.
 */
export async function checkEnvironment(root, fixed, runtime = { node: process.version, platform: process.platform, arch: process.arch, execPath: process.execPath, env: process.env }) {
  const reasons = [], warnings = []
  const observed = { node: runtime.node, platform: runtime.platform, arch: runtime.arch, npm: npmVersion(runtime), packages: {} }
  if (!supportsNode(observed.node)) reasons.push(`unsupported_runtime: Node ${observed.node}; requires ${NODE_RANGE}`)
  if (observed.node !== fixed.versions.node) warnings.push(`reference_environment_differs: Node ${observed.node}; reference ${fixed.versions.node}`)
  if (observed.platform !== fixed.platform || observed.arch !== fixed.arch) warnings.push(`reference_environment_differs: ${observed.platform}/${observed.arch}; reference ${fixed.platform}/${fixed.arch}`)
  if (observed.npm === null) warnings.push('npm_version_unavailable: Vitest runs directly through Node; npm metadata is optional')
  else if (observed.npm !== fixed.versions.npm) warnings.push(`reference_environment_differs: npm ${observed.npm}; reference ${fixed.versions.npm}`)
  for (const name of ['vitest', 'vite', 'typescript', '@vitest/coverage-v8']) {
    try {
      observed.packages[name] = JSON.parse(await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8')).version
      if (observed.packages[name] !== fixed.versions[name]) warnings.push(`reference_environment_differs: ${name} ${observed.packages[name]}; reference ${fixed.versions[name]}`)
    } catch (error) { reasons.push(`environment_error: ${name} unavailable: ${error.code ?? error.message}`) }
  }
  if (observed.packages.vitest && observed.packages['@vitest/coverage-v8'] && observed.packages.vitest !== observed.packages['@vitest/coverage-v8']) reasons.push('incompatible_dependencies: vitest and @vitest/coverage-v8 must have matching versions')
  return { valid: reasons.length === 0, reasons, warnings, observed }
}

/**
 * Select optional Bash CPU timing or portable monotonic wall timing for the whole batch.
 * @param {string} platform - Operating system identifier.
 * @param {Function} probe - Executable probe; injectable for regression tests.
 * @returns {object} Timing mode, CPU availability and nonblocking warnings.
 */
export function selectTiming(platform = process.platform, probe = execFileSync) {
  if (platform !== 'win32') {
    try {
      probe('bash', ['-c', 'exit 0'], { stdio: 'ignore', timeout: 5000 })
      return { mode: 'bash-time', cpuAvailable: true, warnings: [] }
    } catch { /* Fall back consistently for every run when Bash is unavailable. */ }
  }
  return { mode: 'wall-only', cpuAvailable: false, warnings: ['cpu_timing_unavailable: comparing wall time only; CPU values are null'] }
}

/**
 * Build a process command with the same timing mode across all six measurements.
 * @param {string[]} args - Vitest arguments, including the entry path.
 * @param {object} timing - Selected timing mode.
 * @param {string} executable - Node executable path.
 * @returns {{command: string, args: string[]}} Shell-free Node invocation or Bash CPU wrapper.
 */
export function measurementCommand(args, timing, executable = process.execPath) {
  return timing.cpuAvailable
    ? { command: 'bash', args: ['-c', 'TIMEFORMAT="__P29_CPU_USER=%U __P29_CPU_SYSTEM=%S"; time "$@"', 'vitest-time', executable, ...args] }
    : { command: executable, args }
}
