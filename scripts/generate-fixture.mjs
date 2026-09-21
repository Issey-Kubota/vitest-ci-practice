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
  const source = `// Synthetic catalogue module: deterministic import-time index, no timers or I/O.\n` +
    `const catalogue = Array.from({ length: ${rows} }, (_, row) => \`item-${id}-\${String(row).padStart(4, '0')}\`)\n` +
    `const index = new Map(catalogue.map((value, row) => [value, row]))\n` +
    `export function lookup${id}(value: string): number { return index.get(value) ?? -1 }\n` +
    `export function key${id}(row: number): string { return catalogue[row] ?? '' }\n`
  await writeFile(join(sourceDir, `feature-${id}.ts`), source)
}

const barrel = Array.from({ length: moduleCount }, (_, i) => {
  const id = String(i + 1).padStart(2, '0')
  return `export * from './feature-${id}.js'`
}).join('\n') + '\n'
await writeFile(join(sourceDir, 'index.ts'), barrel)

for (let testIndex = 1; testIndex <= testedCount; testIndex += 1) {
  const id = String(testIndex).padStart(2, '0')
  const source = `import { describe, expect, it } from 'vitest'\n` +
    `import { key${id}, lookup${id} } from '../src/features/index.js'\n\n` +
    `describe('feature-${id}', () => {\n` +
    `  it('round-trips a catalogue key', () => {\n` +
    `    const key = key${id}(137)\n` +
    `    expect(key).toMatchInlineSnapshot(\`\"item-${id}-0137\"\`)\n` +
    `    expect(lookup${id}(key)).toBe(137)\n` +
    `  })\n\n` +
    `  it('returns -1 for an unknown key', () => {\n` +
    `    expect(lookup${id}('missing')).toBe(-1)\n` +
    `  })\n` +
    `})\n`
  await writeFile(join(testDir, `feature-${id}.test.ts`), source)
}
