import path from 'path'
import fs from 'fs'
import Parser from './Parser/Index'

const Filename = {
  Radio: process.argv[2],
  Stage: process.argv[3],
}

for (const Key in Filename) {
  if (Filename[Key] == null) {
    console.log('Metal Gear Solid 1 - RADIO - Exporter 1.0.0\nby iseeeva\n')
    console.log('USAGE: \'npm run radio-exporter <RADIO.DAT> <STAGE.DIR>\'\n')
    process.exit()
  }
  else { Filename[Key] = path.resolve(Filename[Key]) }

  if (!fs.existsSync(Filename[Key]))
    throw new Error(`File "${Filename[Key]}" does not exist`)
}

const Output = { Name: `${path.parse(Filename.Radio).name.toUpperCase()}.EXPORT.JSON` }

// //////////////////////////////////

const Database = {}
const Radio = fs.readFileSync(Filename.Radio)
const Map = Parser(Filename.Radio, Filename.Stage, 'map')

function Readable(Input: Buffer) { // Export
  return Array.from(Input).map((Byte) => {
    if (Byte < 32 || Byte > 126)
      return `\\x${Byte.toString(16).padStart(2, '0')}`
    return String.fromCharCode(Byte)
  }).join('')
}

for (const Container in Map) {
  Map[Container].Content.forEach((Element) => {
    Database[Element.Text]
    = Readable(
        Radio.subarray(
          (Element.Text + 8),
          (Element.Text + Radio.readUint16BE(Element.Text)),
        ),
      )
  })
}

fs.writeFileSync(
  path.join(
    path.dirname(Filename.Radio),
    Output.Name,
  ),
  JSON.stringify(Database, null, 2),
)

console.log(`${Output.Name} file created successfully`)
