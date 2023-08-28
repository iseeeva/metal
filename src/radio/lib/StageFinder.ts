import fs from 'fs'
import path from 'path'
import { ReadAs } from 'r_lib'

export default function Finder(Filename: string) {
  if (Filename != null)
    Filename = path.resolve(Filename)
  else
    throw new Error('Filename is not defined')

  if (!fs.existsSync(Filename))
    throw new Error(`File "${Filename}" does not exist`)

  const File = fs.readFileSync(Filename)

  const Database: {
    [Offset: string]: Array<number>
  } = {}

  for (let i = 14000; i < 14300; i++) {
    let Position = 0
    const Search = Buffer.from(`01${ReadAs(i, 'int16').toString('hex')}0A`, 'hex')

    while (File.includes(Search, Position)) {
      const Offset = { Stage: 0, Radio: 0 }
      Offset.Stage = File.indexOf(Search, Position)
      Offset.Radio = File.readUintBE(Offset.Stage + 5, 3)

      if (Database[Offset.Radio] == null)
        Database[Offset.Radio] = []

      Database[Offset.Radio].push(Offset.Stage)

      // console.log(
      //   Search,
      //   i,
      //   Offset.Radio,
      //   Offset.Stage,
      // )

      Position = Offset.Stage + 1
    }
  }

  return Database
}
