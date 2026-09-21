import { describe, expect, it } from 'vitest'
import { key12, lookup12 } from '../src/features/feature-12.js'

describe('feature-12', () => {
  it('round-trips a catalogue key', () => {
    const key = key12(137)
    expect(key).toMatchInlineSnapshot(`"item-12-0137"`)
    expect(lookup12(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup12('missing')).toBe(-1)
  })
})
