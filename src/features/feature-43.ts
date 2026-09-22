/**
 * Synthetic catalogue 43: maps stable item keys to row indices and back.
 * Every module builds its own data at import time so barrel imports perform
 * more initialization work than importing one feature directly. No I/O or timers.
 */
const catalogue = Array.from({ length: 1800 }, (_, row) => `item-43-${String(row).padStart(4, '0')}`)
// Build once at module load; repeated lookups reuse the index.
const index = new Map(catalogue.map((value, row) => [value, row]))
/**
 * Look up a row in catalogue 43.
 * @param {string} value - Exact item key to find.
 * @returns {number} The zero-based row, or -1 when the key is unknown.
 */
export function lookup43(value: string): number { return index.get(value) ?? -1 }
/**
 * Read an item key from catalogue 43.
 * @param {number} row - Zero-based catalogue row.
 * @returns {string} The item key, or an empty string when the row is absent.
 */
export function key43(row: number): string { return catalogue[row] ?? '' }
