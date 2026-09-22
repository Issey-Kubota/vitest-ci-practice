/**
 * Normalize CRLF pairs to LF for fixed-text comparisons without rewriting files.
 * Preserve every other byte, including lone CR, whitespace and invalid UTF-8.
 * @param {string | Buffer} value - Text or file bytes to compare.
 * @returns {Buffer} A new buffer with only CR bytes preceding LF removed.
 */
export function normalizeTextBytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value)
  return bytes.filter((byte, index) => byte !== 13 || bytes[index + 1] !== 10)
}
