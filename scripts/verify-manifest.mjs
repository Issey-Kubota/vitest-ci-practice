import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Pin the reviewed reference bytes; verification must never regenerate its own baseline.
const referenceDigest = '7ce2fe616479a410958005cde31799de0315139da2f104bede67bcd886c19f61'
/**
 * Hash reference or test contents without modifying them.
 * @param {string | Buffer} value - Content to fingerprint.
 * @returns {string} Hexadecimal SHA-256 digest.
 */
const hash = value => createHash('sha256').update(value).digest('hex')

/**
 * Recursively inventory tests, including unexpected files and symlinks.
 * @param {string} directory - Directory to inspect.
 * @param {string} prefix - Relative path prefix; defaults to empty.
 * @returns {Promise<Array<{path: string, regular: boolean}>>} Sorted entries for exact inventory comparison.
 */
async function listFiles(directory, prefix = '') {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name
    if (entry.isDirectory()) {
      found.push(...await listFiles(join(directory, entry.name), relative + '/'))
    } else {
      // Unexpected files and symbolic links are included, never silently ignored.
      found.push({ path: relative, regular: entry.isFile() })
    }
  }
  return found.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Check test bytes and inventory against the pinned baseline; never run or rewrite tests.
 * @param {URL | string} root - Sample root; defaults to the parent of this script.
 * @returns {Promise<object>} Validity, reasons, detected variant, file hashes, test IDs and assertion/snapshot counts.
 */
export async function verifyManifest(root = new URL('..', import.meta.url)) {
  const directory = root instanceof URL ? fileURLToPath(root) : resolve(root)
  const reasons = []
  const files = []
  const result = { valid: false, reasons, variant: null, files, testIds: [], assertions: 0, snapshots: 0, referenceSha256: null }
  let reference
  try {
    const bytes = await readFile(join(directory, 'reference/baseline-tests.json'))
    result.referenceSha256 = hash(bytes)
    if (result.referenceSha256 !== referenceDigest) {
      reasons.push('reference_digest_mismatch: the fixed baseline was modified')
      return result
    }
    reference = JSON.parse(bytes.toString('utf8'))
  } catch (error) {
    reasons.push(`reference_unavailable: ${error.code ?? error.message}`)
    return result
  }

  let actualFiles
  try {
    actualFiles = await listFiles(join(directory, 'tests'), 'tests/')
  } catch (error) {
    reasons.push(`test_tree_unavailable: ${error.code ?? error.message}`)
    return result
  }
  const expected = new Set(reference.files.map(file => file.path))
  const actual = new Map(actualFiles.map(file => [file.path, file]))
  for (const file of actualFiles) {
    if (!expected.has(file.path)) reasons.push(`unexpected_test_file: ${file.path}`)
    if (!file.regular) reasons.push(`non_regular_test_file: ${file.path}`)
  }
  const variants = new Set()
  for (const entry of reference.files) {
    if (!actual.has(entry.path)) {
      reasons.push(`missing_test_file: ${entry.path}`)
      continue
    }
    if (!actual.get(entry.path).regular) continue
    let bytes
    try {
      bytes = await readFile(join(directory, entry.path))
    } catch (error) {
      reasons.push(`unreadable_test_file: ${entry.path}: ${error.code ?? error.message}`)
      continue
    }
    const baseline = Buffer.from(entry.baselineContent)
    // Accept only the designated import substitution; all other bytes must match.
    const candidate = Buffer.from(entry.baselineContent.replace(entry.baselineImport, entry.candidateImport))
    const variant = bytes.equals(baseline) ? 'baseline' : bytes.equals(candidate) ? 'candidate' : null
    if (variant === null) reasons.push(`unauthorized_test_change: ${entry.path}: only its exact designated import target may change`)
    else variants.add(variant)
    // Parse the fixed, controlled fixture format, not arbitrary user test syntax.
    const suite = [...entry.baselineContent.matchAll(/describe\('([^']+)'/g)].map(match => match[1])
    const testIds = [...entry.baselineContent.matchAll(/it\('([^']+)'/g)].map(match => `${entry.path}::${suite.join(' > ')}::${match[1]}`)
    const assertions = [...entry.baselineContent.matchAll(/expect\(/g)].length
    const snapshots = [...entry.baselineContent.matchAll(/toMatchInlineSnapshot\(/g)].length
    files.push({ file: entry.path, variant, sha256: hash(bytes), baselineSha256: hash(baseline), candidateSha256: hash(candidate), testIds, assertions, snapshots })
    result.testIds.push(...testIds)
    result.assertions += assertions
    result.snapshots += snapshots
  }
  if (variants.size > 1) reasons.push('mixed_test_variants: all fixture tests must use the same baseline or candidate variant')
  result.variant = variants.size === 1 ? [...variants][0] : null
  result.valid = reasons.length === 0
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await verifyManifest()
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.valid ? 0 : 1
}
