import { describe, expect, it } from 'vitest'
import { key02, lookup02 } from '../src/features/feature-02.js'

describe('feature-02', () => {
  it('round-trips a catalogue key', () => {
    const key = key02(137)
    expect(key).toMatchInlineSnapshot(`"item-02-0137"`)
    expect(lookup02(key)).toBe(137)
  })

  it('returns -1 for an unknown key', () => {
    expect(lookup02('missing')).toBe(-1)
  })
})
