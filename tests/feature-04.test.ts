import { describe, expect, it } from 'vitest'
import { key04, lookup04 } from '../src/features/feature-04.js'

describe('feature-04', () => {
  it('round-trips a catalogue key', () => {
    const key = key04(137)
    expect(key).toMatchInlineSnapshot(`"item-04-0137"`)
    expect(lookup04(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup04('missing')).toBe(-1)
  })
})
