import fs from 'fs'
import path from 'path'
import { HexReader } from 'r_lib'
import StageFinder from '../lib/StageFinder'
import Formatter from './Formatter'
import type { IConfig, IParser } from './types/Parser'

export default function Parser<T extends 'map' | 'database'>(
  RadioPath: string,
  StagePath: string,
  OutputType: T,
): T extends 'map' ? IParser.Map.Database : IParser.Object.Database {
  const Filename = {
    Radio: RadioPath,
    Stage: StagePath,
  }

  for (const Key in Filename) {
    if (Filename[Key] != null)
      Filename[Key] = path.resolve(Filename[Key])
    else
      throw new Error(`Filename ${Key} is not defined`)

    if (!fs.existsSync(Filename[Key]))
      throw new Error(`File "${Filename[Key]}" does not exist`)
  }

  const Config: IConfig = {
    HexReader: { swap_endian: false, add_pos: true, readAs: 'integer' },
  }

  const Fixed = (Input: Buffer) => Input.toString('hex').toLowerCase()

  // //////////////////////////////////

  const Radio = new HexReader(Filename.Radio)
  const Stages = StageFinder(Filename.Stage)

  const Database: IParser.Database = { Object: [], Map: {} }
  const Format = new Formatter()

  while (Radio.getOffset(0) <= fs.readFileSync(Filename.Radio).length) {
    const Freq = Radio.Read(0, 2, { ...Config.HexReader, add_pos: false })
    if (Freq >= 14000 && Freq <= 14300) {
      const HEADER: IParser.Object.Content = { // 8 BYTE ( +4 SCRIPT ) = 12
        CODE: 'HEADER',
        DATA: {
          OFFSET: Radio.getOffset(0),
          FREQ: Radio.Read(0, 2, Config.HexReader),
          UNK0: Radio.Read(0, 2, Config.HexReader),
          FACE: Radio.Read(0, 2, Config.HexReader),
          UNK1: Radio.Read(0, 2, Config.HexReader),
          SIZE: (() => {
            Radio.setOffset(0, Radio.getOffset(0) + 1)
            const Length = (Radio.Read(0, 2, Config.HexReader) - 3) + 12
            Radio.setOffset(0, Radio.getOffset(0) - 3)
            return Length
          })(),
        },
        INCLUDE: [],
      }

      const Location = Database.Object[Database.Object.length] = [HEADER]
      // console.log('--------------------------------')

      while (Radio.getOffset(0) < (HEADER.DATA.OFFSET + HEADER.DATA.SIZE)) {
        const Command = {
          Offset: Radio.getOffset(0),
          Code: Radio.Read(0, 1, Config.HexReader),
          Length: -1,
        }

        if (
          Command.Code !== 0x00 // NULL
       && Command.Code !== 0xFF // ENDLINE
       && Command.Code !== 0x11 // ELSE
       && Command.Code !== 0x12 // ELSEIF
       && Command.Code !== 0x31 // SWITCH_OP
        )
          Command.Length = Radio.Read(0, 2, Config.HexReader) - 2

        const Add = (Data: IParser.Object.Dynamic) => {
          const Formatted = Format.Add(Data, { Command, Location })

          if (Command.Code === 0x01) { // FORCED 0x01 (SUBTITLE) FILTER
            if (Stages[HEADER.DATA.OFFSET] != null) {
              const Map: IParser.Map.Content = { Text: 0, Required: [] }

              Formatted.forEach((Element, Index) => {
                if (Index === (Formatted.length - 1))
                  Map.Text = Element.Command.Offset + 1
                else
                  Map.Required.push(Element.Command.Offset + 1)
              })

              if (Database.Map[HEADER.DATA.OFFSET] == null) {
                Database.Map[HEADER.DATA.OFFSET] = {
                  Content: [],
                  Stages: Stages[HEADER.DATA.OFFSET],
                }
              }

              Database.Map[HEADER.DATA.OFFSET].Content.push(Map)
            }
            else {
              // throw new Error(`${HEADER.DATA.OFFSET} STAGE.DIR içinde bulunamadı (muhtemelen senin hatan)`)
            }
          }
        }

        switch (Command.Code) {
          case 0x00: // NULL
            break
          case 0x01: // SUBTITLE
            Add({
              CODE: 'SUBTITLE',
              DATA: {
                ACTOR: Fixed(Radio.Read(0, 2, { add_pos: true })),
                FACE: Fixed(Radio.Read(0, 2, { add_pos: true })),
                NULL: Fixed(Radio.Read(0, 2, { add_pos: true })),
                TEXT: Radio.Read(0, (Command.Length - 6), { add_pos: true }).toString(),
              },
            })
            break
          case 0x02: // VOICE
            Add({
              CODE: 'VOICE',
              DATA: {
                UNK0: Fixed(Radio.Read(0, 2, { add_pos: true })),
                UNK1: Fixed(Radio.Read(0, 2, { add_pos: true })),
              },
              INCLUDE: [],
            })
            break
          case 0x03: // ANIM
            Add({
              CODE: 'ANIM',
              DATA: {
                ACTOR: Fixed(Radio.Read(0, 2, { add_pos: true })),
                FACE: Fixed(Radio.Read(0, 2, { add_pos: true })),
                NULL: Fixed(Radio.Read(0, 2, { add_pos: true })),
              },
            })
            break
          case 0x04: // ADD_CONTACT
            Add({
              CODE: 'ADD_CONTACT',
              DATA: {
                FREQ: Radio.Read(0, 2, Config.HexReader),
                TEXT: Radio.Read(0, Command.Length - 3, { add_pos: true }).toString(),
              },
            })
            break
          case 0x05: // MEM_SAVE
            Add({
              CODE: 'MEM_SAVE',
              DATA: {
                UNK0: Fixed(Radio.Read(0, Command.Length, { add_pos: true })),
              },
            })
            break
          case 0x06: // AUDIO
            Add({
              CODE: 'AUDIO',
              DATA: {
                UNK0: Fixed(Radio.Read(0, 2, { add_pos: true })),
                UNK1: Fixed(Radio.Read(0, 2, { add_pos: true })),
                UNK2: Fixed(Radio.Read(0, 2, { add_pos: true })),
              },
            })
            break
          case 0x07: // PROMPT
            Add({
              CODE: 'PROMPT',
              DATA: (() => {
                const Params = [] as string[]
                while (Radio.getOffset(0) <= Command.Offset + Command.Length) {
                  if (Radio.Read(0, 1, { ...Config.HexReader, add_pos: false }) === 0x07) {
                    Radio.setOffset(0, Radio.getOffset(0) + 1)
                    Params.push(Radio.Read(0, Radio.Read(0, 1, Config.HexReader), { add_pos: true }).toString())
                  }
                  else { throw new Error(`Prompt have a unknown type at ${Radio.getOffset(0)}`) }
                }
                return { Params }
              })(),
            })
            break
          case 0x08: // SAVE
            Add({
              CODE: 'SAVE',
              DATA: {
                UNK0: Fixed(Radio.Read(0, Command.Length, { add_pos: true })),
              },
            })
            break
          case 0x10: // IF (ELSE 0x11 ELSEIF 0x12)
          case 0x12:
            Add({
              CODE: Command.Code === 0x10 ? 'IF' : 'ELSEIF',
              DATA: (() => {
                if (Radio.Read(0, 1, { ...Config.HexReader, add_pos: false }) === 0x30) {
                  Radio.setOffset(0, Radio.getOffset(0) + 1)
                  return { EXPRESSION: Fixed(Radio.Read(0, Radio.Read(0, 1, Config.HexReader) - 1, { add_pos: true })) }
                }
                else {
                  return {
                    UNK0: Fixed(Radio.Read(0, Command.Length, { add_pos: true })),
                  }
                }
              })(),
              INCLUDE: [],
            })
            break
          case 0x11:
            Add({ CODE: 'ELSE' })
            break
          case 0x30: // SWITCH?
            Add({
              CODE: 'SWITCH',
              DATA: {
                VALUE: Radio.Read(0, 2, Config.HexReader),
              },
              INCLUDE: [],
            })
            break
          case 0x31: // SWITCH OPERATOR?
            Add({
              CODE: 'SWITCH_OP',
              DATA: {
                VALUE: Radio.Read(0, 2, Config.HexReader),
              },
            })
            break
          case 0x40: // EVAL
            Add({
              CODE: 'EVAL',
              DATA: {
                UNK0: Fixed(Radio.Read(0, Command.Length, { add_pos: true })),
              },
            })
            break
          case 0x80: // SCRIPT
            Add({ CODE: 'SCRIPT', INCLUDE: [] })
            break
          case 0xFF: // END or \n idk
            break
          default:
            throw new Error(`ERROR: ${Command.Offset} offset have a unknown code: ${Command.Code.toString(16)}, please contact with iseeeva.`)
        }
      }
      Radio.setOffset(0, (HEADER.DATA.OFFSET + HEADER.DATA.SIZE))
    }
    else {
      Radio.Read(0, 36, { add_pos: true })
    }
  }

  switch (OutputType) {
    case 'map':
      console.log(`Successfully created MAP for ${path.basename(Filename.Radio)} file`)
      return Database.Map as any
    case 'database':
      console.log(`Successfully created DATABASE for ${path.basename(Filename.Radio)} file`)
      return Database.Object as any
    default:
      throw new Error(`ERROR: ${OutputType} is a unknown output type`)
  }
}
