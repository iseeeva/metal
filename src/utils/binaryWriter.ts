export class BinaryWriter {
  private _buffer: Buffer
  private _offset: number

  public get offset(): number {
    return this._offset
  }

  constructor(initialSize: number = 1024) {
    this._buffer = Buffer.alloc(initialSize)
    this._offset = 0
  }

  // #region Utils
  setOffset(offset: number) {
    this._offset = offset
  }
  // #endregion

  // #region UInt8
  writeUInt8(value: number): void {
    this._buffer.writeUInt8(value, this._offset)
    this._offset += 1
  }

  static toUInt8(value: number): Buffer {
    const buffer = Buffer.alloc(1)
    buffer.writeUInt8(value, 0)
    return buffer
  }
  // #endregion

  // #region UInt16
  writeUInt16LE(value: number): void {
    this._buffer.writeUInt16LE(value, this._offset)
    this._offset += 2
  }

  static toUInt16LE(value: number): Buffer {
    const buffer = Buffer.alloc(2)
    buffer.writeUInt16LE(value, 0)
    return buffer
  }

  writeUInt16BE(value: number): void {
    this._buffer.writeUInt16BE(value, this._offset)
    this._offset += 2
  }

  static toUInt16BE(value: number): Buffer {
    const buffer = Buffer.alloc(2)
    buffer.writeUInt16BE(value, 0)
    return buffer
  }
  // #endregion

  // #region UInt32
  writeUInt32LE(value: number): void {
    this._buffer.writeUInt32LE(value, this._offset)
    this._offset += 4
  }

  static toUInt32LE(value: number): Buffer {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32LE(value, 0)
    return buffer
  }

  writeUInt32BE(value: number): void {
    this._buffer.writeUInt32BE(value, this._offset)
    this._offset += 4
  }

  static toUInt32BE(value: number): Buffer {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32BE(value, 0)
    return buffer
  }
  // #endregion

  // #region Float32
  writeFloat32LE(value: number): void {
    this._buffer.writeFloatLE(value, this._offset)
    this._offset += 4
  }

  static toFloat32LE(value: number): Buffer {
    const buffer = Buffer.alloc(4)
    buffer.writeFloatLE(value, 0)
    return buffer
  }

  writeFloat32BE(value: number): void {
    this._buffer.writeFloatBE(value, this._offset)
    this._offset += 4
  }

  static toFloat32BE(value: number): Buffer {
    const buffer = Buffer.alloc(4)
    buffer.writeFloatBE(value, 0)
    return buffer
  }
  // #endregion

  // #region Float16
  writeFloat16LE(value: number): void {
    const float16 = new Float16Array(1)
    float16[0] = value
    const buffer = Buffer.from(float16.buffer, float16.byteOffset, 2)
    buffer.copy(this._buffer, this._offset)
    this._offset += 2
  }

  static toFloat16LE(value: number): Buffer {
    const float16 = new Float16Array(1)
    float16[0] = value
    return Buffer.from(float16.buffer, float16.byteOffset, 2)
  }

  writeFloat16BE(value: number): void {
    const float16 = new Float16Array(1)
    float16[0] = value
    const buffer = Buffer.from(float16.buffer, float16.byteOffset, 2).reverse()
    buffer.copy(this._buffer, this._offset)
    this._offset += 2
  }

  static toFloat16BE(value: number): Buffer {
    const float16 = new Float16Array(1)
    float16[0] = value
    return Buffer.from(float16.buffer, float16.byteOffset, 2).reverse()
  }
  // #endregion

  getBuffer(): Buffer {
    return this._buffer.subarray(0, this._offset)
  }
}
