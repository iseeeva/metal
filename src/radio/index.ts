import path from 'path'
import fs from 'fs'
import Parser from './parser/index.js'

export function Exporter(File: { Radio: string; Stage: string }) {
  for (const [Key, Value] of Object.entries(File)) {
    if (Value == null) {
      console.log('Radio Exporter')
      console.log('Usage: \'metal.exe <this-script> <RADIO.DAT> <STAGE.DIR>\'\n')
      process.exit()
    }

    if (!fs.existsSync(Value))
      throw new Error(`File "${Key}" does not exist (${Value})`)
  }

  const Output = { Name: `${path.parse(File.Radio).name.toUpperCase()}.EXPORT.JSON` }

  // //////////////////////////////////

  const Database = {}
  const Radio = fs.readFileSync(File.Radio)
  const Map = Parser({ Radio: File.Radio, Stage: File.Stage }, 'map')

  function Readable(Input: Buffer) { // Filter non-ascii characters
    return Array.from(Input).map((Byte) => {
      if (Byte < 32 || Byte > 126)
        return `\\x${Byte.toString(16).padStart(2, '0')}`
      else
        return String.fromCharCode(Byte)
    }).join('')
  }

  for (const Container in Map) {
    Map[Container].Content.forEach((Element) => {
      Database[Element.Text] = Readable(Radio.subarray((Element.Text + 8), (Element.Text + Radio.readUint16BE(Element.Text))))
    })
  }

  fs.writeFileSync(
    path.join(path.dirname(File.Radio), Output.Name),
    JSON.stringify(Database, null, 2),
  )

  console.log(`${Output.Name} file created successfully`)
}

export function Importer(File: { Input: string; Radio: string; Stage: string }) {
  for (const [Key, Value] of Object.entries(File)) {
    if (Value == null) {
      console.log('Radio Re-Importer')
      console.log('Usage: \'metal.exe <this-script> <RADIO.EXPORT.JSON> <RADIO.DAT> <STAGE.DIR>\'\n')
      process.exit()
    }

    if (!fs.existsSync(Value))
      throw new Error(`File "${Key}" does not exist (${Value})`)
  }

  const Output = {
    Radio: path.join(path.dirname(File.Radio), `${path.parse(File.Radio).name.toUpperCase()}.EXPORT.DAT`),
    Stage: path.join(path.dirname(File.Stage), `${path.parse(File.Stage).name.toUpperCase()}.EXPORT.DIR`),
  }

  for (const File in Output)
    fs.writeFileSync(Output[File], '')

  // //////////////////////////////////

  const Input = JSON.parse(fs.readFileSync(File.Input, 'utf-8')) as string[]
  const Radio = fs.readFileSync(File.Radio)
  const Stage = fs.readFileSync(File.Stage)
  const Map = Parser({ Radio: File.Radio, Stage: File.Stage }, 'map')

  function Readable(Input: string) { // Render non-ascii characters
    const Match = Input.match(/\\x([0-9a-fA-F]{2})|./g)
    if (Match) {
      return Buffer.from(Match.map((Byte) => {
        if (Byte.startsWith('\\x'))
          return parseInt(Byte.slice(2), 16)
        else
          return Byte.charCodeAt(0)
      }))
    }
    else { return Buffer.from(Input, 'ascii') }
  }

  let Difference = 0
  for (const Container in Map) {
    Map[Container].Stages.forEach((Offset) => {
      const Value = Stage.readUintBE(Offset + 5, 3) + Difference
      Stage.writeUIntBE(Value, Offset + 5, 3)
    })

    Map[Container].Content.forEach((Element) => {
      const Size = {
        Original: (Radio.readUInt16BE(Element.Text) - 8),
        New: Readable(Input[Element.Text]).length,
      }

      if (Size.Original > Size.New)
        Difference -= Size.Original - Size.New
      else
        Difference += Size.New - Size.Original

      Element.Required.forEach(Offset => Radio.writeUint16BE((Radio.readUInt16BE(Offset) - Size.Original) + Size.New, Offset))
      Map[Container].Stages.forEach(Offset => Stage.writeInt8(((Radio.readUInt16BE(Element.Required[0]) + 9) / 2048) + 1, Offset + 4))
    })
  }

  let Location = 0
  for (const Container in Map) {
    Map[Container].Content.forEach((Element) => {
      const Length = Radio.readUInt16BE(Element.Text)

      Radio.writeUint16BE(8 + Readable(Input[Element.Text]).length, Element.Text)
      fs.appendFileSync(Output.Radio, Radio.subarray(Location, (Element.Text + 8)))
      fs.appendFileSync(Output.Radio, Readable(Input[Element.Text]))
      Location = Element.Text + Length
    })
  }

  fs.appendFileSync(Output.Radio, Radio.subarray(Location, Radio.length))
  fs.writeFileSync(Output.Stage, Stage)

  console.log(`${Output.Radio} and ${Output.Stage} file created successfully`)
}
