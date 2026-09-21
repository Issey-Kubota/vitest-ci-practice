import { describe, expect, it } from 'vitest'
import { key07, lookup07 } from '../src/features/feature-07.js'

describe('feature-07', () => {
  it('round-trips a catalogue key', () => {
    const key = key07(137)
    expect(key).toMatchInlineSnapshot(`"item-07-0137"`)
    expect(lookup07(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup07('missing')).toBe(-1)
  })
})
