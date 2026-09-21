import { describe, expect, it } from 'vitest'
import { key13, lookup13 } from '../src/features/feature-13.js'

describe('feature-13', () => {
  it('round-trips a catalogue key', () => {
    const key = key13(137)
    expect(key).toMatchInlineSnapshot(`"item-13-0137"`)
    expect(lookup13(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup13('missing')).toBe(-1)
  })
})
