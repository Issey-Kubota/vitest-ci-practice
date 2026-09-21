import { describe, expect, it } from 'vitest'
import { key03, lookup03 } from '../src/features/feature-03.js'

describe('feature-03', () => {
  it('round-trips a catalogue key', () => {
    const key = key03(137)
    expect(key).toMatchInlineSnapshot(`"item-03-0137"`)
    expect(lookup03(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup03('missing')).toBe(-1)
  })
})
