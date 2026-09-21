import { describe, expect, it } from 'vitest'
import { key15, lookup15 } from '../src/features/feature-15.js'

describe('feature-15', () => {
  it('round-trips a catalogue key', () => {
    const key = key15(137)
    expect(key).toMatchInlineSnapshot(`"item-15-0137"`)
    expect(lookup15(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup15('missing')).toBe(-1)
  })
})
