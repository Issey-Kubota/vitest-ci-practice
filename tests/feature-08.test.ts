/**
 * Verify catalogue 08 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key08, lookup08 } from '../src/features/feature-08.js'

describe('feature-08', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key08(137)
    expect(key).toMatchInlineSnapshot(`"item-08-0137"`)
    expect(lookup08(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup08('missing')).toBe(-1)
  })
})
