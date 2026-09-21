import { describe, expect, it } from 'vitest'
import { key16, lookup16 } from '../src/features/feature-16.js'

describe('feature-16', () => {
  it('round-trips a catalogue key', () => {
    const key = key16(137)
    expect(key).toMatchInlineSnapshot(`"item-16-0137"`)
    expect(lookup16(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup16('missing')).toBe(-1)
  })
})
