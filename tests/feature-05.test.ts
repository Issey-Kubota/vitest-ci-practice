import { describe, expect, it } from 'vitest'
import { key05, lookup05 } from '../src/features/feature-05.js'

describe('feature-05', () => {
  it('round-trips a catalogue key', () => {
    const key = key05(137)
    expect(key).toMatchInlineSnapshot(`"item-05-0137"`)
    expect(lookup05(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup05('missing')).toBe(-1)
  })
})
