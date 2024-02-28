import type { IParser } from './types/index.js'

export default class Formatter {
  private Database: Array<
    {
      Command: {
        Offset: number
        Code: number
        Length: number
      }
      Location: IParser.Object.Dynamic[]
    }
  > = [] // should be private?

  Add(
    Data: IParser.Object.Dynamic,
    Options: {
      Command: {
        Offset: number
        Code: number
        Length: number
      }
      Location: IParser.Object.Dynamic[]
    },
  ) {
    this.Database = this.Database.filter(Element => (Element.Command.Offset + Element.Command.Length + 2) > Options.Command.Offset)
    if (this.Database.length >= 1) {
      this.Database.push({
        ...Options,
        Location: this.Database[this.Database.length - 1].Location[this.Database[this.Database.length - 1].Location.length - 1].Include as IParser.Object.Dynamic[],
      })
    }
    else {
      this.Database.push({
        ...Options,
        Location: Options.Location[Options.Location.length - 1].Include as IParser.Object.Dynamic[],
      })
    }

    this.Database[this.Database.length - 1].Location.push(Data)
    return this.Database
  }
}
