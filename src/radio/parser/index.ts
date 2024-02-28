import fs from 'fs'
import path from 'path'
import { HexReader } from '@twisine/r_lib'
import { Stage } from '../../stage/index.js'
import Formatter from './formatter.js'
import type { IParser } from './types/index.js'

export default function Parser<T extends 'map' | 'database'>(
  File: {
    Radio: string
    Stage: string
  },
  Output: T,
): T extends 'map' ? IParser.Map.Database : IParser.Object.Database {
  for (const [Key, Value] of Object.entries(File)) {
    if (Value == null)
      throw new Error(`File ${Key} is not defined`)

    if (!fs.existsSync(Value))
      throw new Error(`File "${Key}" does not exist (${Value})`)
  }

  const Config = {
    HexReader: { isLittle: false, addPos: true, readAs: 'integer' } as const,
  }

  const Fixed = (Input: Buffer) => Input.toString('hex').toLowerCase()

  // //////////////////////////////////

  const Radio = new HexReader(File.Radio)
  const Stages = Stage.Finder(File.Stage)
  Radio.setOffset(0, 0)

  const Database: IParser.Database = { Object: [], Map: {} }
  const Format = new Formatter()

  while (Radio.getOffset(0) <= fs.readFileSync(File.Radio).length) {
    const Freq = Radio.read(0, 2, { ...Config.HexReader, addPos: false })
    if (Freq >= 14000 && Freq <= 14300) {
      const Header: IParser.Object.Dynamic = { // 8 BYTE ( +4 SCRIPT ) = 12
        Code: 'Header',
        Data: {
          Offset: Radio.getOffset(0),
          Freq: Radio.read(0, 2, Config.HexReader),
          Unk0: Radio.read(0, 2, Config.HexReader),
          Face: Radio.read(0, 2, Config.HexReader),
          Unk1: Radio.read(0, 2, Config.HexReader),
          Size: (() => {
            Radio.setOffset(0, Radio.getOffset(0) + 1)
            const Length = (Radio.read(0, 2, Config.HexReader) - 3) + 12
            Radio.setOffset(0, Radio.getOffset(0) - 3)
            return Length
          })(),
        },
        Include: [],
      }

      const Location = Database.Object[Database.Object.length] = [Header]
      // console.log('--------------------------------')

      while (Radio.getOffset(0) < (Header.Data.Offset + Header.Data.Size)) {
        const Command = {
          Offset: Radio.getOffset(0),
          Code: Radio.read(0, 1, Config.HexReader),
          Length: -1,
        }

        if (
          Command.Code !== 0x00 // Null
       && Command.Code !== 0xFF // ENDLINE
       && Command.Code !== 0x11 // ELSE
       && Command.Code !== 0x12 // ELSEIF
       && Command.Code !== 0x31 // SWITCH_OP
        )
          Command.Length = Radio.read(0, 2, Config.HexReader) - 2

        const Add = (Data: IParser.Object.Dynamic) => {
          const Formatted = Format.Add(Data, { Command, Location })

          if (Command.Code === 0x01) { // FORCED 0x01 (SUBTITLE) FILTER
            if (Stages[Header.Data.Offset] != null) {
              const Map: IParser.Map.Content = { Text: 0, Required: [] }

              Formatted.forEach((Element, Index) => {
                if (Index === (Formatted.length - 1))
                  Map.Text = Element.Command.Offset + 1
                else
                  Map.Required.push(Element.Command.Offset + 1)
              })

              if (Database.Map[Header.Data.Offset] == null) {
                Database.Map[Header.Data.Offset] = {
                  Content: [],
                  Stages: Stages[Header.Data.Offset],
                }
              }

              Database.Map[Header.Data.Offset].Content.push(Map)
            }
            else {
              // throw new Error(`${Header.DATA.Offset} STAGE.DIR içinde bulunamadı (muhtemelen senin hatan)`)
            }
          }
        }

        switch (Command.Code) {
          case 0x00: // Null
            break
          case 0x01: // SUBTITLE
            Add({
              Code: 'SUBTITLE',
              Data: {
                Actor: Fixed(Radio.read(0, 2, { addPos: true })),
                Face: Fixed(Radio.read(0, 2, { addPos: true })),
                Null: Fixed(Radio.read(0, 2, { addPos: true })),
                Text: Radio.read(0, (Command.Length - 6), { addPos: true }).toString(),
              },
            })
            break
          case 0x02: // VOICE
            Add({
              Code: 'VOICE',
              Data: {
                Unk0: Fixed(Radio.read(0, 2, { addPos: true })),
                Unk1: Fixed(Radio.read(0, 2, { addPos: true })),
              },
              Include: [],
            })
            break
          case 0x03: // ANIM
            Add({
              Code: 'ANIM',
              Data: {
                Actor: Fixed(Radio.read(0, 2, { addPos: true })),
                Face: Fixed(Radio.read(0, 2, { addPos: true })),
                Null: Fixed(Radio.read(0, 2, { addPos: true })),
              },
            })
            break
          case 0x04: // ADD_CONTACT
            Add({
              Code: 'ADD_CONTACT',
              Data: {
                Freq: Radio.read(0, 2, Config.HexReader),
                Text: Radio.read(0, Command.Length - 3, { addPos: true }).toString(),
              },
            })
            break
          case 0x05: // MEM_SAVE
            Add({
              Code: 'MEM_SAVE',
              Data: {
                Unk0: Fixed(Radio.read(0, Command.Length, { addPos: true })),
              },
            })
            break
          case 0x06: // AUDIO
            Add({
              Code: 'AUDIO',
              Data: {
                Unk0: Fixed(Radio.read(0, 2, { addPos: true })),
                Unk1: Fixed(Radio.read(0, 2, { addPos: true })),
                Unk2: Fixed(Radio.read(0, 2, { addPos: true })),
              },
            })
            break
          case 0x07: // PROMPT
            Add({
              Code: 'PROMPT',
              Data: (() => {
                const Params = [] as string[]
                while (Radio.getOffset(0) <= Command.Offset + Command.Length) {
                  if (Radio.read(0, 1, { ...Config.HexReader, addPos: false }) === 0x07) {
                    Radio.setOffset(0, Radio.getOffset(0) + 1)
                    Params.push(Radio.read(0, Radio.read(0, 1, Config.HexReader), { addPos: true }).toString())
                  }
                  else { throw new Error(`Prompt have a unknown type at ${Radio.getOffset(0)}`) }
                }
                return { Params }
              })(),
            })
            break
          case 0x08: // SAVE
            Add({
              Code: 'SAVE',
              Data: {
                Unk0: Fixed(Radio.read(0, Command.Length, { addPos: true })),
              },
            })
            break
          case 0x10: // IF (ELSE 0x11 ELSEIF 0x12)
          case 0x12:
            Add({
              Code: Command.Code === 0x10 ? 'IF' : 'ELSEIF',
              Data: (() => {
                if (Radio.read(0, 1, { ...Config.HexReader, addPos: false }) === 0x30) {
                  Radio.setOffset(0, Radio.getOffset(0) + 1)
                  return { EXPRESSION: Fixed(Radio.read(0, Radio.read(0, 1, Config.HexReader) - 1, { addPos: true })) }
                }
                else {
                  return {
                    Unk0: Fixed(Radio.read(0, Command.Length, { addPos: true })),
                  }
                }
              })(),
              Include: [],
            })
            break
          case 0x11:
            Add({ Code: 'ELSE' })
            break
          case 0x30: // SWITCH?
            Add({
              Code: 'SWITCH',
              Data: {
                Value: Radio.read(0, 2, Config.HexReader),
              },
              Include: [],
            })
            break
          case 0x31: // SWITCH OPERATOR?
            Add({
              Code: 'SWITCH_OP',
              Data: {
                Value: Radio.read(0, 2, Config.HexReader),
              },
            })
            break
          case 0x40: // EVAL
            Add({
              Code: 'EVAL',
              Data: {
                Unk0: Fixed(Radio.read(0, Command.Length, { addPos: true })),
              },
            })
            break
          case 0x80: // SCRIPT
            Add({ Code: 'SCRIPT', Include: [] })
            break
          case 0xFF: // END or \n idk
            break
          default:
            throw new Error(`ERROR: ${Command.Offset} offset have a unknown code: ${Command.Code.toString(16)}, please contact with iseeeva.`)
        }
      }
      Radio.setOffset(0, (Header.Data.Offset + Header.Data.Size))
    }
    else {
      Radio.read(0, 36, { addPos: true })
    }
  }

  switch (Output) {
    case 'map':
      console.log(`Successfully created MAP for ${path.basename(File.Radio)} file`)
      return Database.Map as any
    case 'database':
      console.log(`Successfully created DATABASE for ${path.basename(File.Radio)} file`)
      return Database.Object as any
    default:
      throw new Error(`ERROR: ${Output} is a unknown output type`)
  }
}
