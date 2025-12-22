import fs from 'node:fs'

export class Stage {
  static searchContainerReferences(file: string) {
    if (!file)
      throw new Error('File is not defined')
    if (!fs.existsSync(file))
      throw new Error(`File does not exist (${file})`)

    const fileReader = fs.readFileSync(file)
    const database: { [containerOffset: string]: number[] | undefined } = {}

    for (let i = 14000; i < 14300; i++) {
      let position = 0

      const pattern = Buffer.from(new Uint8Array([0x01, 0x00, 0x00, 0x0A]))
      pattern.writeUint16BE(i, 1) // add freq int to pattern

      let patternOffset = -1
      while ((patternOffset = fileReader.indexOf(pattern, position)) !== -1) {
        /** offset reference to radio.dat container */
        const containerOffset = fileReader.readUintBE(patternOffset + 5, 3)

        database[containerOffset] ??= []
        database[containerOffset].push(patternOffset)
        position = patternOffset + 1
      }
    }

    return database
  }
}
