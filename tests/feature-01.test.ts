/**
 * Verify catalogue 01 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key01, lookup01 } from '../src/features/feature-01.js'

describe('feature-01', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key01(137)
    expect(key).toMatchInlineSnapshot(`"item-01-0137"`)
    expect(lookup01(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup01('missing')).toBe(-1)
  })
})
