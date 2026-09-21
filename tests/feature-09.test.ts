import { describe, expect, it } from 'vitest'
import { key09, lookup09 } from '../src/features/feature-09.js'

describe('feature-09', () => {
  it('round-trips a catalogue key', () => {
    const key = key09(137)
    expect(key).toMatchInlineSnapshot(`"item-09-0137"`)
    expect(lookup09(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup09('missing')).toBe(-1)
  })
})
