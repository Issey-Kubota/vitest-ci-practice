/**
 * Verify catalogue 16 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key16, lookup16 } from '../src/features/feature-16.js'

describe('feature-16', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key16(137)
    expect(key).toMatchInlineSnapshot(`"item-16-0137"`)
    expect(lookup16(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup16('missing')).toBe(-1)
  })
})
