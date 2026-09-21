import { describe, expect, it } from 'vitest'
import { key06, lookup06 } from '../src/features/feature-06.js'

describe('feature-06', () => {
  it('round-trips a catalogue key', () => {
    const key = key06(137)
    expect(key).toMatchInlineSnapshot(`"item-06-0137"`)
    expect(lookup06(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup06('missing')).toBe(-1)
  })
})
