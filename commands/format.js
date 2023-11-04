const path = require('path')
const glob = require('fast-glob')
const fs = require('fs-extra')

const run = require('../utils/run')

const prettierIgnorePath = path.resolve(
  path.join(__dirname, '..', 'config', '.prettierignore')
)

async function format({ config, lint = false }) {
  if (!config.format) {
    const { homepage } = require('../package.json')

    console.log(
      `Format command requires the "format" property in the config file

Documentation: ${homepage}#format
`
    )
    return
  }

  const { lintPhpFiles, formatPhpFiles } = await import('@tangible/php-beautify')

  const { rootDir } = config
  const knownTypes = ['html', 'js', 'json', 'php', 'scss']

  let patterns = config.format

  if (!Array.isArray(patterns)) {
    patterns = [patterns]
  }

  patterns.forEach((pattern, index) => {
    if (
      pattern[0] !== '!' &&
      pattern.indexOf('*') < 0 &&
      fs.existsSync(pattern)
    ) {
      // All files in a directory
      patterns[index] = `${pattern}/**/*.{${knownTypes.join(',')}}`
    }
  })

  const files = await glob(patterns, {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/vendor/**'],
  })

  // Organize by file extensions
  const filesByType = files.reduce(function (obj, file) {
    const extension = file.split('.').pop()
    if (knownTypes.indexOf(extension) < 0) return obj
    if (!obj[extension]) obj[extension] = []
    obj[extension].push(file)
    return obj
  }, {})

  const commands = []
  const prettierFiles = []
  let requirePhp = false

  const maxFileListLength = 1024
  function batchFileLists(files, separator = ' ') {

    // Batch files to avoid ENAMETOOLONG error when command too long
    const fileLists = []
    let current = ''

    for (const file of files) {
      if ((current.length + file.length) > maxFileListLength) {
        fileLists.push( current )
        current = ''
      }
      current += (current ? separator : '')+file
    }

    if (current) {
      fileLists.push( current )
    }

    return fileLists
  }

  let hasPhp = false

  for (const type of Object.keys(filesByType)) {
    if (type !== 'php') {

      if (lint) continue // No lint for JS, Sass, etc.

      prettierFiles.push(...filesByType[type]
        .map(f => f.replace(/"/g, '"')) // Escape quotes just in case
      )
      continue
    }
    /**
     * PHP_CodeSniffer requires the following extensions to be enabled:
     * Tokenizer, SimpleXML, XMLWriter
     *
     * sudo apt-get install php7.4-xml
     * php -i | grep "xml"
     *
     * https://github.com/squizlabs/PHP_CodeSniffer/wiki/Requirements
     *
     * Option -s means include source codes in the report
     * https://github.com/squizlabs/PHP_CodeSniffer/wiki/Usage
     */

    const files = filesByType[type].map(f => path.relative(rootDir, f))

    commands.push({
      type: 'php',
      title: `..Running PHP ${lint ? 'Lint' : 'Beautify'}`,
      async command() {
        if (lint) {
          await lintPhpFiles(files)
        } else {
          await formatPhpFiles(files)
        }
      }
    })

    hasPhp = true
  }

  if (prettierFiles.length) {

    const fileLists = batchFileLists(prettierFiles, ',')

    for (const fileList of fileLists) {

      // https://prettier.io/docs/en/options.html
      // https://prettier.io/docs/en/cli.html#--cache
      commands.push({
        title: '..Running Prettier\n',
        command: `npx prettier --no-config --no-semi --single-quote --ignore-path ${prettierIgnorePath} --write --cache --cache-strategy metadata "${
          fileList.indexOf(',')===-1 ? fileList : `{${fileList}}`
        }"`,
      })
    }
  }

  const titleDisplayed = {}

  await Promise.all(
    commands.map(function ({ type, title, command, ignoreCommandFailed }) {

      if (!titleDisplayed[type]) {
        console.log(title)
        titleDisplayed[type] = true
      }

      // console.log(`..Running command: ${command}\n`)

      if (command instanceof Function) {
        return command().catch(console.error)
      }

      return run(command, {
        cwd: rootDir,
      }).catch((e) => {
        /**
         * Workaround for phpcbf returning with non-zero exit code even
         * when beautify completed successfully.
         */
        if (
          //ignoreCommandFailed && 
          e.message.indexOf('Command failed') === 0)
          return

        console.error(e.message)
      }) // Let other tasks complete
    })
  )

  if (hasPhp) process.exit() // Exit to stop PHP process
}

module.exports = format
