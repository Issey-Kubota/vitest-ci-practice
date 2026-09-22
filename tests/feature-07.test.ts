/**
 * Verify catalogue 07 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key07, lookup07 } from '../src/features/feature-07.js'

describe('feature-07', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key07(137)
    expect(key).toMatchInlineSnapshot(`"item-07-0137"`)
    expect(lookup07(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup07('missing')).toBe(-1)
  })
})
