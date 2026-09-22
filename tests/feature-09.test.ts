/**
 * Verify catalogue 09 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key09, lookup09 } from '../src/features/feature-09.js'

describe('feature-09', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key09(137)
    expect(key).toMatchInlineSnapshot(`"item-09-0137"`)
    expect(lookup09(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup09('missing')).toBe(-1)
  })
})
