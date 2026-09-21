import { describe, expect, it } from 'vitest'
import { key11, lookup11 } from '../src/features/feature-11.js'

describe('feature-11', () => {
  it('round-trips a catalogue key', () => {
    const key = key11(137)
    expect(key).toMatchInlineSnapshot(`"item-11-0137"`)
    expect(lookup11(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup11('missing')).toBe(-1)
  })
})
