// Synthetic catalogue module: deterministic import-time index, no timers or I/O.
const catalogue = Array.from({ length: 1800 }, (_, row) => `item-34-${String(row).padStart(4, '0')}`)
const index = new Map(catalogue.map((value, row) => [value, row]))
export function lookup34(value: string): number { return index.get(value) ?? -1 }
export function key34(row: number): string { return catalogue[row] ?? '' }
