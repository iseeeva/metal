import { radioTextExport, radioTextImport } from './radio/radioExportImport.js'

const [script, ...parameters] = process.argv.slice(2, process.argv.length)

switch (script) {
  case 'radio-exporter':
    radioTextExport({ radio: parameters[0], stage: parameters[1] })
    break
  case 'radio-importer':
    radioTextImport({ jsonWork: parameters[0], radio: parameters[1], stage: parameters[2] })
    break
  default:
    console.log('Metal Gear Solid 1 PSX Tools by iseeeva')
    console.log('Usage: metal.exe <script> <parameter> <parameter>..')
    console.log('Scripts: radio-exporter, radio-importer\n')
    process.exit()
}
