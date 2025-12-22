import type { RadioCommand } from './types/radioCommand.js'
import type { RadioContainer, RadioDatabase } from './types/radioContainer.js'
import fs from 'node:fs'
import { Stage } from '../stage/index.js'
import { bytesToAsciiEscapedString } from '../utils/ascii.js'
import { BinaryReader } from '../utils/binaryReader.js'
import { RadioCode } from './types/radioCode.js'

export function radioParser(
  fileName: {
    radio: string
    stage: string
  },
): RadioDatabase {
  for (const [key, value] of Object.entries(fileName)) {
    if (!value)
      throw new Error(`File ${key} is not defined`)
    if (!fs.existsSync(value))
      throw new Error(`File "${key}" does not exist (${value})`)
  }

  const database: RadioDatabase = {}
  const radioReader = new BinaryReader(fs.readFileSync(fileName.radio))
  const containerRefs = Stage.searchContainerReferences(fileName.stage)

  const toHexString = (buf: Buffer) => buf.toString('hex').toLowerCase()

  // ======================================================
  // Command Processors
  // ======================================================

  // Chain system for knowing which commands affects to other commands with his changes
  // Stage references, inner radio references (command sizes etc.) needs this
  const _activeCommandChain: RadioCommand[] = []

  function _addCommandToChain(command: RadioCommand) {
    for (let i = _activeCommandChain.length - 1; i >= 0; i--) { // remove already handled commands
      if (_activeCommandChain[i].offset + _activeCommandChain[i].size + 2 <= command.offset) {
        _activeCommandChain.splice(i, 1)
      }
    }

    command.responsible = [..._activeCommandChain]
    _activeCommandChain.push(command)
  }

  function processCommand(
    container: RadioContainer,
    command: RadioCommand,
  ) {
    _addCommandToChain(command)
    container.commands.push(command)
  }

  // ======================================================
  // Parser
  // ======================================================

  while (radioReader.offset < radioReader.bufferLength) {
    const freq = radioReader.readUInt16BE()
    radioReader.setOffset(radioReader.offset - 2)

    if (freq < 14000 || freq > 14300) {
      radioReader.readBinary(36)
      continue
    }

    const container: RadioContainer = {
      offset: radioReader.offset,
      freq: radioReader.readUInt16BE(),
      unk0: radioReader.readUInt16BE(),
      face: radioReader.readUInt16BE(),
      unk1: radioReader.readUInt16BE(),
      references: [],
      commands: [],
      size: -1,
    }

    if (radioReader.readUInt8() !== RadioCode.SCRIPT) {
      throw new Error(`Container ${container.offset} starts with missing SCRIPT opcode`)
    }

    container.references = containerRefs[container.offset] ?? []
    container.size = (radioReader.readUInt16BE() - 3) + 12
    radioReader.setOffset(radioReader.offset - 3)

    while (radioReader.offset < container.offset + container.size) {
      let command: RadioCommand
      const offset = radioReader.offset
      const code = radioReader.readUInt8()
      const size = (() => {
        switch (code) {
          // does have
          case RadioCode.SUBTITLE:
          case RadioCode.VOICE:
          case RadioCode.ANIM:
          case RadioCode.ADD_CONTACT:
          case RadioCode.MEM_SAVE:
          case RadioCode.AUDIO:
          case RadioCode.PROMPT:
          case RadioCode.SAVE:
          case RadioCode.IF:
          case RadioCode.SWITCH:
          case RadioCode.EVAL:
          case RadioCode.SCRIPT:
            return radioReader.readUInt16BE() - 2

          // doesn't have size
          case RadioCode.NULL:
          case RadioCode.ENDLINE:
          case RadioCode.ELSE:
          case RadioCode.ELSE_IF:
          case RadioCode.SWITCH_OP:
          default:
            return -1
        }
      })()

      switch (code) {
        case RadioCode.SCRIPT:
        case RadioCode.ENDLINE:
        case RadioCode.NULL:
          command = {
            code,
            offset,
            size,
            data: {},
            responsible: [],
          }
          break

        case RadioCode.SUBTITLE:
          command = {
            code,
            offset,
            size,
            data: {
              actor: toHexString(radioReader.readBinary(2)),
              face: toHexString(radioReader.readBinary(2)),
              unk0: toHexString(radioReader.readBinary(2)),
              text: bytesToAsciiEscapedString(radioReader.readBinary(size - 6)),
            },
            responsible: [],
          }
          break

        case RadioCode.VOICE:
          command = {
            code,
            offset,
            size,
            data: {
              unk0: toHexString(radioReader.readBinary(2)),
              unk1: toHexString(radioReader.readBinary(2)),
            },
            responsible: [],
          }
          break

        case RadioCode.ANIM:
          command = {
            code,
            offset,
            size,
            data: {
              actor: toHexString(radioReader.readBinary(2)),
              face: toHexString(radioReader.readBinary(2)),
              unk0: toHexString(radioReader.readBinary(2)),
            },
            responsible: [],
          }
          break

        case RadioCode.ADD_CONTACT:
          command = {
            code,
            offset,
            size,
            data: {
              freq: radioReader.readUInt16BE(),
              text: bytesToAsciiEscapedString(radioReader.readBinary(size - 2)),
            },
            responsible: [],
          }
          break

        case RadioCode.MEM_SAVE:
        case RadioCode.SAVE:
        case RadioCode.EVAL:
          command = {
            code,
            offset,
            size,
            data: {
              unk0: toHexString(radioReader.readBinary(size)),
            },
            responsible: [],
          }
          break

        case RadioCode.AUDIO:
          command = {
            code,
            offset,
            size,
            data: {
              unk0: toHexString(radioReader.readBinary(2)),
              unk1: toHexString(radioReader.readBinary(2)),
              unk2: toHexString(radioReader.readBinary(2)),
            },
            responsible: [],
          }
          break

        case RadioCode.PROMPT: {
          const params: string[] = []
          while (radioReader.offset < offset + size) {
            if (radioReader.readUInt8() !== RadioCode.PROMPT) {
              throw new Error(`Invalid PROMPT block at ${radioReader.offset}`)
            }
            const len = radioReader.readUInt8()
            params.push(bytesToAsciiEscapedString(radioReader.readBinary(len)))
          }

          command = {
            code,
            offset,
            size,
            data: { params },
            responsible: [],
          }
          break
        }

        case RadioCode.IF:
        case RadioCode.ELSE_IF:
        case RadioCode.ELSE: {
          const data = (() => {
            switch (code) {
              case RadioCode.IF:
              case RadioCode.ELSE_IF: {
                const ifcode = radioReader.readUInt8() as RadioCode
                radioReader.setOffset(radioReader.offset - 1)

                switch (ifcode) {
                  case RadioCode.SWITCH: {
                    radioReader.readUInt8() // read skipped peek
                    return {
                      expression: toHexString(radioReader.readBinary(radioReader.readUInt8() - 1)),
                    }
                  }

                  default:{
                    return {
                      expression: toHexString(radioReader.readBinary(size)), // idk and doesn't want
                    }

                    //  throw new Error(`Unknown opcode 0x${peek.toString(16)} at ${radioReader.offset}`)
                  }
                }
              }

              case RadioCode.ELSE:
              default:
                return { }
            }
          })()

          command = {
            code,
            offset,
            size,
            data,
            responsible: [],
          }
          break
        }

        case RadioCode.SWITCH:
        case RadioCode.SWITCH_OP:
          command = {
            code,
            offset,
            size,
            data: { value: radioReader.readUInt16BE() },
            responsible: [],
          }
          break

        default:
          throw new Error(`Unknown opcode 0x${code.toString(16)} at ${radioReader.offset}`)
      }

      processCommand(container, command as RadioCommand)
    }

    if (database[container.offset] == null)
      database[container.offset] = container
    else
      throw new Error(`Container ${container.offset} already created`)

    radioReader.setOffset(container.offset + container.size)
  }

  return database
}
