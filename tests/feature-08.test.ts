import { describe, expect, it } from 'vitest'
import { key08, lookup08 } from '../src/features/feature-08.js'

describe('feature-08', () => {
  it('round-trips a catalogue key', () => {
    const key = key08(137)
    expect(key).toMatchInlineSnapshot(`"item-08-0137"`)
    expect(lookup08(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup08('missing')).toBe(-1)
  })
})
