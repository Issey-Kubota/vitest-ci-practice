/**
 * Verify catalogue 15 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key15, lookup15 } from '../src/features/feature-15.js'

describe('feature-15', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key15(137)
    expect(key).toMatchInlineSnapshot(`"item-15-0137"`)
    expect(lookup15(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup15('missing')).toBe(-1)
  })
})
