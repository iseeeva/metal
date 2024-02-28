import fs from 'fs'
import { Convert } from '@twisine/r_lib'

export class Stage {
  static Finder(File: string) {
    if (File == null)
      throw new Error('File is not defined')
    else if (!fs.existsSync(File))
      throw new Error(`File does not exist (${File})`)

    const Stream = fs.readFileSync(File)
    const Database: { [Offset: string]: Array<number> } = {}

    for (let i = 14000; i < 14300; i++) {
      let Position = 0
      const Content = Buffer.from(`01${Convert.toBuffer(i, 'int16').toString('hex')}0A`, 'hex')

      while (Stream.includes(Content, Position)) {
        const Stage = Stream.indexOf(Content, Position)
        const Radio = Stream.readUintBE(Stage + 5, 3)

        if (Database[Radio] == null)
          Database[Radio] = []

        Database[Radio].push(Stage)

        // console.log(Search, i, Radio, Stage)
        Position = Stage + 1
      }
    }

    return Database
  }
}
