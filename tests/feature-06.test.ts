/**
 * Verify catalogue 06 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key06, lookup06 } from '../src/features/feature-06.js'

describe('feature-06', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key06(137)
    expect(key).toMatchInlineSnapshot(`"item-06-0137"`)
    expect(lookup06(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup06('missing')).toBe(-1)
  })
})
