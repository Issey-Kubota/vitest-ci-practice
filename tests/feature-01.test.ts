import { describe, expect, it } from 'vitest'
import { key01, lookup01 } from '../src/features/feature-01.js'

describe('feature-01', () => {
  it('round-trips a catalogue key', () => {
    const key = key01(137)
    expect(key).toMatchInlineSnapshot(`"item-01-0137"`)
    expect(lookup01(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup01('missing')).toBe(-1)
  })
})
