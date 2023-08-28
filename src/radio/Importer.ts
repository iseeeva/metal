import path from 'path'
import fs from 'fs'
import Parser from './Parser/Index'

const Filename = {
  Input: process.argv[2],
  Radio: process.argv[3],
  Stage: process.argv[4],
}

for (const Key in Filename) {
  if (Filename[Key] == null) {
    console.log('Metal Gear Solid 1 - RADIO - Re-Importer 1.0.0\nby iseeeva\n')
    console.log('USAGE: \'npm run radio-importer <RADIO.EXPORT.JSON> <RADIO.DAT> <STAGE.DIR>\'\n')
    process.exit()
  }
  else { Filename[Key] = path.resolve(Filename[Key]) }

  if (!fs.existsSync(Filename[Key]))
    throw new Error(`File "${Filename[Key]}" does not exist`)
}

const Output = {
  Radio: path.join(
    path.dirname(Filename.Radio),
    `${path.parse(Filename.Radio).name.toUpperCase()}.EXPORT.DAT`,
  ),
  Stage: path.join(
    path.dirname(Filename.Stage),
    `${path.parse(Filename.Stage).name.toUpperCase()}.EXPORT.DIR`,
  ),
}

for (const Filename in Output)
  fs.writeFileSync(Output[Filename], '')

// //////////////////////////////////

const Input = JSON.parse(fs.readFileSync(Filename.Input, 'utf-8')) as string[]
const Radio = fs.readFileSync(Filename.Radio)
const Stage = fs.readFileSync(Filename.Stage)
const Map = Parser(Filename.Radio, Filename.Stage, 'map')

function Readable(Input: string) { // Import
  const Pair = Input.match(/\\x([0-9a-fA-F]{2})|./g)
  if (!Pair)
    return Buffer.alloc(0)

  return Buffer.from(
    Pair.map((Byte) => {
      if (Byte.startsWith('\\x'))
        return parseInt(Byte.slice(2), 16)
      else
        return Byte.charCodeAt(0)
    }),
  )
}

let Difference = 0
for (const Container in Map) {
  Map[Container].Stages.forEach((Offset) => {
    const Value = Stage.readUintBE(Offset + 5, 3) + Difference
    Stage.writeUIntBE(Value, Offset + 5, 3)
  })

  Map[Container].Content.forEach((Element) => {
    const Size = { Original: (Radio.readUInt16BE(Element.Text) - 8), New: Readable(Input[Element.Text]).length }
    if (Size.Original === Size.New)
      Difference += 0
    else if (Size.Original < Size.New)
      Difference += Size.New - Size.Original
    else if (Size.Original > Size.New)
      Difference -= Size.Original - Size.New

    Element.Required.forEach((Offset) => {
      Radio.writeUint16BE(
        (Radio.readUInt16BE(Offset) - Size.Original) + Size.New,
        Offset,
      )
    })

    Map[Container].Stages.forEach((Offset) => {
      const Value = ((Radio.readUInt16BE(Element.Required[0]) + 9) / 2048) + 1
      Stage.writeInt8(Value, Offset + 4)
    })
  })
}

let Location = 0
for (const Container in Map) {
  Map[Container].Content.forEach((Element) => {
    const Length = Radio.readUInt16BE(Element.Text)

    Radio.writeUint16BE(
      8 + Readable(Input[Element.Text]).length,
      Element.Text,
    )

    fs.appendFileSync(
      Output.Radio,
      Radio.subarray(Location, (Element.Text + 8)),
    )

    fs.appendFileSync(
      Output.Radio,
      Readable(Input[Element.Text]),
    )

    Location = Element.Text + Length
  })
}

fs.writeFileSync(Output.Stage, Stage)
