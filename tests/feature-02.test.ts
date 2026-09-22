/**
 * Verify catalogue 02 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key02, lookup02 } from '../src/features/feature-02.js'

describe('feature-02', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key02(137)
    expect(key).toMatchInlineSnapshot(`"item-02-0137"`)
    expect(lookup02(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup02('missing')).toBe(-1)
  })
})
