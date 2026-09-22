/**
 * Verify catalogue 04 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key04, lookup04 } from '../src/features/feature-04.js'

describe('feature-04', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key04(137)
    expect(key).toMatchInlineSnapshot(`"item-04-0137"`)
    expect(lookup04(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup04('missing')).toBe(-1)
  })
})
