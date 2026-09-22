/**
 * Verify catalogue 05 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key05, lookup05 } from '../src/features/feature-05.js'

describe('feature-05', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key05(137)
    expect(key).toMatchInlineSnapshot(`"item-05-0137"`)
    expect(lookup05(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup05('missing')).toBe(-1)
  })
})
