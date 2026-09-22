// Regenerate the deterministic sample sources and baseline tests.
// This maintenance command does not regenerate or approve the pinned references.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const sourceDir = join(root, 'src', 'features')
const testDir = join(root, 'tests')
await mkdir(sourceDir, { recursive: true })
await mkdir(testDir, { recursive: true })

const moduleCount = 48
const testedCount = 16
const rows = 1800

for (let moduleIndex = 1; moduleIndex <= moduleCount; moduleIndex += 1) {
  const id = String(moduleIndex).padStart(2, '0')
  const source = "/**\n * Synthetic catalogue CATALOGUE_ID: maps stable item keys to row indices and back.\n * Every module builds its own data at import time so barrel imports perform\n * more initialization work than importing one feature directly. No I/O or timers.\n */\n".replaceAll("CATALOGUE_ID", id) +
    `const catalogue = Array.from({ length: ${rows} }, (_, row) => \`item-${id}-\${String(row).padStart(4, '0')}\`)\n` +
    "// Build once at module load; repeated lookups reuse the index.\n" +
    `const index = new Map(catalogue.map((value, row) => [value, row]))\n` +
    "/**\n * Look up a row in catalogue CATALOGUE_ID.\n * @param {string} value - Exact item key to find.\n * @returns {number} The zero-based row, or -1 when the key is unknown.\n */\n".replaceAll("CATALOGUE_ID", id) +
    `export function lookup${id}(value: string): number { return index.get(value) ?? -1 }\n` +
    "/**\n * Read an item key from catalogue CATALOGUE_ID.\n * @param {number} row - Zero-based catalogue row.\n * @returns {string} The item key, or an empty string when the row is absent.\n */\n".replaceAll("CATALOGUE_ID", id) +
    `export function key${id}(row: number): string { return catalogue[row] ?? '' }\n`
  await writeFile(join(sourceDir, `feature-${id}.ts`), source)
}

const barrel = Array.from({ length: moduleCount }, (_, i) => {
  const id = String(i + 1).padStart(2, '0')
  return `export * from './feature-${id}.js'`
}).join('\n') + '\n'
await writeFile(join(sourceDir, 'index.ts'), '// Public barrel for the sample: importing it evaluates all catalogue modules.\n' + barrel)

for (let testIndex = 1; testIndex <= testedCount; testIndex += 1) {
  const id = String(testIndex).padStart(2, '0')
  const source = "/**\n * Verify catalogue CATALOGUE_ID using the same assertions for both import variants.\n * The snapshot fixes the generated key; the lookup must recover its row.\n */\n".replaceAll("CATALOGUE_ID", id) +
    `import { describe, expect, it } from 'vitest'\n` +
    `import { key${id}, lookup${id} } from '../src/features/index.js'\n\n` +
    `describe('feature-${id}', () => {\n` +
    "  // A stable key and its reverse lookup must agree on row 137.\n" +
    `  it('round-trips a catalogue key', () => {\n` +
    `    const key = key${id}(137)\n` +
    `    expect(key).toMatchInlineSnapshot(\`\"item-${id}-0137\"\`)\n` +
    `    expect(lookup${id}(key)).toBe(137)\n` +
    `  })\n\n` +
    "  // Unknown keys must use the sentinel value instead of a valid row.\n" +
    `  it('returns -1 for an unknown key', () => {\n` +
    `    expect(lookup${id}('missing')).toBe(-1)\n` +
    `  })\n` +
    `})\n`
  await writeFile(join(testDir, `feature-${id}.test.ts`), source)
}
