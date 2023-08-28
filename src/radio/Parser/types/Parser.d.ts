import { BufferReadTypes } from "r_lib"

export namespace IParser {

  namespace Object {
    interface Dynamic {
      CODE: string
      DATA?: { [Key: string]: any }
      INCLUDE?: Array<Content>
    }

    interface Content {
      CODE: string
      DATA: {
        OFFSET: number
        FREQ: number
        UNK0: number
        FACE: number
        UNK1: number
        SIZE: number
      }
      INCLUDE?: Array<Dynamic>
    }
    
    type Database = Array<[Content]>
  }

  namespace Map {
    interface Content {
        Text: number
        Required: Array<number>
    }

    interface Database {
      [Container: string]: {
        Stages: number[]
        Content: Array<Content>
      }
    }
  }

  interface Database {
    Object: Object.Database
    Map: Map.Database
  }

}

export interface IConfig {
  HexReader: { swap_endian: boolean; add_pos: boolean; readAs: BufferReadTypes }
}