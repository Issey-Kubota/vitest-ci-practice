import { describe, expect, it } from 'vitest'
import { key14, lookup14 } from '../src/features/feature-14.js'

describe('feature-14', () => {
  it('round-trips a catalogue key', () => {
    const key = key14(137)
    expect(key).toMatchInlineSnapshot(`"item-14-0137"`)
    expect(lookup14(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup14('missing')).toBe(-1)
  })
})
