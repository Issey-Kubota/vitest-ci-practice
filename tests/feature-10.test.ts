import { describe, expect, it } from 'vitest'
import { key10, lookup10 } from '../src/features/feature-10.js'

describe('feature-10', () => {
  it('round-trips a catalogue key', () => {
    const key = key10(137)
    expect(key).toMatchInlineSnapshot(`"item-10-0137"`)
    expect(lookup10(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup10('missing')).toBe(-1)
  })
})
