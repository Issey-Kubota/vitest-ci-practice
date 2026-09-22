/**
 * Verify catalogue 10 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key10, lookup10 } from '../src/features/feature-10.js'

describe('feature-10', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key10(137)
    expect(key).toMatchInlineSnapshot(`"item-10-0137"`)
    expect(lookup10(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup10('missing')).toBe(-1)
  })
})
