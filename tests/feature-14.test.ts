/**
 * Verify catalogue 14 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key14, lookup14 } from '../src/features/feature-14.js'

describe('feature-14', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key14(137)
    expect(key).toMatchInlineSnapshot(`"item-14-0137"`)
    expect(lookup14(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup14('missing')).toBe(-1)
  })
})
