import * as Radio from './radio/index.js'

const Input = {
  Script: process.argv[2],
  Parameters: process.argv.slice(3, process.argv.length),
}

switch (Input.Script) {
  case 'radio-exporter':
    Radio.Exporter({ Radio: Input.Parameters[0], Stage: Input.Parameters[1] })
    break
  case 'radio-importer':
    Radio.Importer({ Input: Input.Parameters[0], Radio: Input.Parameters[1], Stage: Input.Parameters[2] })
    break
  default:
    console.log('Metal Gear Solid 1 PSX Tools by iseeeva')
    console.log('Usage: metal.exe <script> <parameter> <parameter>..')
    console.log('Scripts: radio-exporter, radio-importer')
    process.exit()
}
