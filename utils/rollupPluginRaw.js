// Based on: https://github.com/loonguo/rollup-plugin-raw

import { resolve } from 'path'
import { readFileSync } from 'fs'
import { createFilter } from '@rollup/pluginutils'
// import type { Plugin } from 'rollup'
// import { RollupRawOptions } from '../types/type.js'

export default function raw(options /*: RollupRawOptions */)/*: Plugin */ {
  if (!options.include) {
    throw Error('include option should be specified')
  }

  const filter = createFilter(options.include, options.exclude)

  return {
    name: 'rollup-plugin-raw',

    resolveId(importee, importer) {
      const prefix = /^\.\.?\//
      const suffix = /\?raw$/
      if (suffix.test(importee)) {
        if (prefix.test(importee)) {
          return resolve(/* <string> */importer, '..', importee.replace(suffix, ''))
        } else {
          return resolve(process.cwd(), importee.replace(suffix, ''))
        }
      }
    },

    transform(_, id) {
      if (filter(id)) {
        const filePath = resolve(process.cwd(), id)
        const fileContent = readFileSync(filePath, 'utf-8')
        return {
          code: `export default ${JSON.stringify(fileContent)};`,
          map: { mappings: '' }
        }
      }
    }
  }
}
