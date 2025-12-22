export function bytesToAsciiEscapedString(input: Buffer) {
  return Array.from(input).map((byte) => {
    return (byte < 32 || byte > 126)
      ? `\\x${byte.toString(16).padStart(2, '0')}`
      : String.fromCharCode(byte)
  }).join('')
}

export function asciiEscapedStringToBytes(input: string) {
  const match = input.match(/\\x([0-9a-fA-F]{2})|./g)
  if (!match) {
    return Buffer.from(input, 'ascii')
  }

  return Buffer.from(match.map((chunk) => {
    return chunk.startsWith('\\x')
      ? Number.parseInt(chunk.slice(2), 16)
      : chunk.charCodeAt(0)
  }))
}
