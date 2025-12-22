import fs from 'node:fs'
import path from 'node:path'
import { asciiEscapedStringToBytes, bytesToAsciiEscapedString } from '../utils/ascii.js'
import { radioParser } from './radioParser.js'
import { RadioCode } from './types/radioCode.js'

export function radioTextExport(fileName: { radio: string, stage: string }) {
  for (const [key, value] of Object.entries(fileName)) {
    if (value == null) {
      console.log('RadioText exporter')
      console.log('Info: This script exports radio texts to json format')
      console.log('Usage: \'metal.exe <this-script> <RADIO.DAT> <STAGE.DIR>\'\n')
      process.exit()
    }

    if (!fs.existsSync(value)) {
      throw new Error(`File "${key}" does not exist (${value})`)
    }
  }

  const outputPath = createOutput(fileName.radio, 'JSON')
  ////////////////////////////////////

  const radioDatabase = radioParser({ radio: fileName.radio, stage: fileName.stage })
  const textDatabase: { [commandOffset: number]: string } = {}

  for (const container of Object.values(radioDatabase)) {
    if (container.references.length === 0) {
      // if container doesn't have reference on stage, skip that
      continue
    }

    for (const command of container.commands) {
      if (command.code !== RadioCode.SUBTITLE) {
        continue
      }

      textDatabase[command.offset]
        = bytesToAsciiEscapedString(Buffer.from(command.data.text, 'ascii'))
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(textDatabase, null, 2))
  console.log(`${outputPath} file created successfully`)
}

export function radioTextImport(fileName: { jsonWork: string, radio: string, stage: string }) {
  for (const [key, value] of Object.entries(fileName)) {
    if (value == null) {
      console.log('RadioText importer')
      console.log('Info: This script re-imports exported radio texts to back')
      console.log('Usage: \'metal.exe <this-script> <RADIO.EXPORT.JSON> <RADIO.DAT> <STAGE.DIR>\'\n')
      process.exit()
    }

    if (!fs.existsSync(value)) {
      throw new Error(`File "${key}" does not exist (${value})`)
    }
  }

  const outputName = {
    radio: createOutput(fileName.radio, 'DAT'),
    stage: createOutput(fileName.stage, 'DIR'),
  }

  ////////////////////////////////////

  const radioWork = JSON.parse(fs.readFileSync(fileName.jsonWork, 'utf-8')) as string[]
  const radioFile = fs.readFileSync(fileName.radio)
  const stageFile = fs.readFileSync(fileName.stage)
  const radioDatabase = radioParser({ radio: fileName.radio, stage: fileName.stage })

  let _diffSize = 0
  let _appendOffset = 0

  for (const container of Object.values(radioDatabase)) {
    if (container.references.length === 0) {
      // if container doesn't have reference on stage, skip that
      continue
    }

    for (const stageOffset of container.references) {
      const v = stageFile.readUIntBE(stageOffset + 5, 3) + _diffSize
      stageFile.writeUIntBE(v, stageOffset + 5, 3)
    }

    for (const command of container.commands) {
      if (command.code !== RadioCode.SUBTITLE) {
        continue
      }

      const orgCommandSize = radioFile.readUInt16BE(command.offset + 1)
      const orgTextSize = orgCommandSize - 8

      const newTextBytes = asciiEscapedStringToBytes(radioWork[command.offset])
      const newTextSize = newTextBytes.length

      _diffSize
        += newTextSize - orgTextSize

      for (const chainCommand of command.responsible) {
        const newCommandSize = (radioFile.readUInt16BE(chainCommand.offset + 1) - orgTextSize) + newTextSize
        radioFile.writeUInt16BE(newCommandSize, chainCommand.offset + 1)
      }

      for (const offset of container.references) {
        const newReferenceOffset = ((radioFile.readUInt16BE(command.responsible[0].offset + 1) + 9) / 2048) + 1
        stageFile.writeInt8(newReferenceOffset, offset + 4)
      }
    }

    for (const command of container.commands) {
      if (command.code !== RadioCode.SUBTITLE) {
        continue
      }

      const orgCommandSize = radioFile.readUInt16BE(command.offset + 1)
      const orgTextSize = radioFile.readUInt16BE(command.offset + 1) - 8
      const newText = asciiEscapedStringToBytes(radioWork[command.offset])
      radioFile.writeUInt16BE((orgCommandSize - orgTextSize) + newText.length, command.offset + 1)

      fs.appendFileSync(outputName.radio, radioFile.subarray(_appendOffset, command.offset + 9))
      fs.appendFileSync(outputName.radio, newText)

      _appendOffset = (command.offset + 1) + orgCommandSize
    }
  }

  fs.appendFileSync(outputName.radio, radioFile.subarray(_appendOffset, radioFile.length))
  fs.writeFileSync(outputName.stage, stageFile)

  console.log(`${outputName.radio} and ${outputName.stage} file created successfully`)
}

function createOutput(filePath: string, extension: string) {
  const { dir, name } = path.parse(filePath)
  const outputPath = path.join(dir, `${name.toUpperCase()}.EXPORT.${extension.toUpperCase()}`)
  fs.writeFileSync(outputPath, '')
  return outputPath
}
