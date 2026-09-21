// Synthetic catalogue module: deterministic import-time index, no timers or I/O.
const catalogue = Array.from({ length: 1800 }, (_, row) => `item-16-${String(row).padStart(4, '0')}`)
const index = new Map(catalogue.map((value, row) => [value, row]))
export function lookup16(value: string): number { return index.get(value) ?? -1 }
export function key16(row: number): string { return catalogue[row] ?? '' }
