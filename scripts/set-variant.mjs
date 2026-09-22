// Switch only the import path; expectations and snapshots stay identical.
// This CLI persists the selected variant. Use measure for automatic restoration.
import { readFile, writeFile } from 'node:fs/promises'

const variant = process.argv[2]
if (!['baseline', 'candidate'].includes(variant)) {
  console.error('usage: node scripts/set-variant.mjs baseline|candidate')
  process.exit(2)
}

for (let i = 1; i <= 16; i += 1) {
  const id = String(i).padStart(2, '0')
  const path = new URL(`../tests/feature-${id}.test.ts`, import.meta.url)
  let text = await readFile(path, 'utf8')
  text = text.replace(
    /from '\.\.\/src\/features\/(?:index|feature-\d{2})\.js'/,
    `from '../src/features/${variant === 'baseline' ? 'index' : `feature-${id}`}.js'`
  )
  await writeFile(path, text)
}
console.log(`variant set to ${variant}`)
