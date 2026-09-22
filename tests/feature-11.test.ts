/**
 * Verify catalogue 11 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key11, lookup11 } from '../src/features/feature-11.js'

describe('feature-11', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key11(137)
    expect(key).toMatchInlineSnapshot(`"item-11-0137"`)
    expect(lookup11(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup11('missing')).toBe(-1)
  })
})
