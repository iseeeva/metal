import type { RadioCommand } from './radioCommand'

export interface RadioContainer {
  offset: number
  freq: number
  face: number
  unk0: number
  unk1: number
  commands: RadioCommand[]
  references: number[]
  size: number
}

export interface RadioDatabase {
  [containerOffset: string]: RadioContainer
}
