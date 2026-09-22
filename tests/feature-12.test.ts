/**
 * Verify catalogue 12 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key12, lookup12 } from '../src/features/feature-12.js'

describe('feature-12', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key12(137)
    expect(key).toMatchInlineSnapshot(`"item-12-0137"`)
    expect(lookup12(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup12('missing')).toBe(-1)
  })
})
