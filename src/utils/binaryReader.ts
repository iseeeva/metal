export class BinaryReader {
  private _buffer: Buffer
  private _offset: number

  public get offset(): number {
    return this._offset
  }

  constructor(buffer: Buffer) {
    this._buffer = buffer
    this._offset = 0
  }

  // #region Utils
  setOffset(offset: number) {
    this._offset = offset
  }
  // #endregion

  // #region Binary
  readBinary(size: number): Buffer {
    const value = this._buffer.subarray(this._offset, this._offset + size)
    this._offset += value.length
    return value
  }
  // #endregion

  // #region Int8
  readInt8(): number {
    const value = this._buffer.readInt8(this._offset)
    this._offset += 1
    return value
  }
  // #endregion

  // #region UInt8
  readUInt8(): number {
    const value = this._buffer.readUInt8(this._offset)
    this._offset += 1
    return value
  }
  // #endregion

  // #region Int16
  readInt16LE(): number {
    const value = this._buffer.readInt16LE(this._offset)
    this._offset += 2
    return value
  }

  readInt16BE(): number {
    const value = this._buffer.readInt16BE(this._offset)
    this._offset += 2
    return value
  }
  // #endregion

  // #region UInt16
  readUInt16LE(): number {
    const value = this._buffer.readUInt16LE(this._offset)
    this._offset += 2
    return value
  }

  readUInt16BE(): number {
    const value = this._buffer.readUInt16BE(this._offset)
    this._offset += 2
    return value
  }
  // #endregion

  // #region Int32
  readInt32LE(): number {
    const value = this._buffer.readInt32LE(this._offset)
    this._offset += 4
    return value
  }

  readInt32BE(): number {
    const value = this._buffer.readInt32BE(this._offset)
    this._offset += 4
    return value
  }
  // #endregion

  // #region UInt32
  readUInt32LE(): number {
    const value = this._buffer.readUInt32LE(this._offset)
    this._offset += 4
    return value
  }

  readUInt32BE(): number {
    const value = this._buffer.readUInt32BE(this._offset)
    this._offset += 4
    return value
  }
  // #endregion

  // #region Float32
  readFloat32LE(): number {
    const value = this._buffer.readFloatLE(this._offset)
    this._offset += 4
    return value
  }

  readFloat32BE(): number {
    const value = this._buffer.readFloatBE(this._offset)
    this._offset += 4
    return value
  }
  // #endregion

  // #region Float16
  readFloat16LE(): number {
    const bytes = this._buffer.subarray(this._offset, this._offset + 2)
    const uint16 = bytes[0] | (bytes[1] << 8)
    const float16 = new Float16Array(1)
    new Uint16Array(float16.buffer)[0] = uint16
    this._offset += 2
    return float16[0]
  }

  readFloat16BE(): number {
    const bytes = this._buffer.subarray(this._offset, this._offset + 2)
    const uint16 = (bytes[0] << 8) | bytes[1]
    const float16 = new Float16Array(1)
    new Uint16Array(float16.buffer)[0] = uint16
    this._offset += 2
    return float16[0]
  }
  // #endregion

  get bufferLength(): number {
    return this._buffer.length
  }
}
