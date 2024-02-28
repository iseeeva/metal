export namespace IParser {
  namespace Object {
    interface Dynamic {
      Code: string
      Data?: { [Key: string]: any }
      Include?: Array<Dynamic>
    }

    type Database = Array<[Dynamic]>
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
