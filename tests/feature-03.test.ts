/**
 * Verify catalogue 03 using the same assertions for both import variants.
 * The snapshot fixes the generated key; the lookup must recover its row.
 */
import { describe, expect, it } from 'vitest'
import { key03, lookup03 } from '../src/features/feature-03.js'

describe('feature-03', () => {
  // A stable key and its reverse lookup must agree on row 137.
  it('round-trips a catalogue key', () => {
    const key = key03(137)
    expect(key).toMatchInlineSnapshot(`"item-03-0137"`)
    expect(lookup03(key)).toBe(137)
  })

  // Unknown keys must use the sentinel value instead of a valid row.
  it('returns -1 for an unknown key', () => {
    expect(lookup03('missing')).toBe(-1)
  })
})
