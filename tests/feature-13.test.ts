/**
 * Verify catalogue 13 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key13, lookup13 } from '../src/features/feature-13.js'

describe('feature-13', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key13(137)
    expect(key).toMatchInlineSnapshot(`"item-13-0137"`)
    expect(lookup13(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup13('missing')).toBe(-1)
  })
})
