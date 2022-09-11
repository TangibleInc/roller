const path = require('path')
const { execSync } = require('child_process')

const glob = require('fast-glob')
const fs = require('fs-extra')

const prettierIgnorePath = path.resolve(
  path.join(__dirname, '..', 'config', '.prettierignore')
)

const phpLibPath = path.resolve(path.join(__dirname, '..', 'lib', 'php'))
const phpcbfPath = path.join(phpLibPath, 'phpcbf.phar')
const phpcsPath = path.join(phpLibPath, 'phpcs.phar')
const wpcsPath = path.join(phpLibPath, 'wpcs')
const standardPath = path.join(phpLibPath, 'phpcs.xml')

const run = (cmd, options = {}) =>
  new Promise((resolve, reject) => {
    const { silent = false, capture = false, cwd = process.cwd() } = options

    // if (!silent && !capture) console.log(cmd)

    try {
      const result = capture
        ? execSync(cmd, { stdio: 'pipe', cwd }).toString()
        : execSync(cmd, { stdio: 'inherit', cwd })

      if (capture) return resolve(result)
      if (result && !silent) console.log(result)
      resolve()
    } catch (e) {
      reject(e)
    }
  })

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
      return
    }
  })

  const files = await glob(patterns, {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/vendor/**'],
  })

  // Organize by file extensions
  const filesByType = files.reduce(function (obj, file) {
    const extension = file.split('.').pop()
    if (knownTypes.indexOf(extension) < 0) return
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

  Object.keys(filesByType).forEach((type) => {
    if (type !== 'php') {
      if (lint) return // No lint for JS, Sass, etc.
      prettierFiles.push(...filesByType[type]
        .map(f => f.replace(/"/g, '"')) // Escape quotes just in case)
      )
      return
    }
    /**
     * PHP_CodeSniffer requires the following PHP extensions to be enabled: Tokenizer, SimpleXML, XMLWriter
     *
     * sudo apt-get install php7.4-xml
     * php -i | grep "xml"
     *
     * https://github.com/squizlabs/PHP_CodeSniffer/wiki/Requirements
     *
     * Option -s means include source codes in the report
     * https://github.com/squizlabs/PHP_CodeSniffer/wiki/Usage
     */

    const fileLists = batchFileLists(
      filesByType[type].map(f => path.relative(rootDir, f))
    )

    for (const fileList of fileLists) {

      commands.push({
        type: 'php',
        title: `..Running PHP ${lint ? 'Lint' : 'Beautify'}`,
        command: `php ${
          lint ? phpcsPath : phpcbfPath
        } -s -q --extensions=php --runtime-set ignore_errors_on_exit 1 --runtime-set ignore_warnings_on_exit 1 --parallel=5 --runtime-set installed_paths ${wpcsPath} --standard=${standardPath} ${fileList}`, // || true
        ignoreCommandFailed: true,
      })
    }

    requirePhp = true
  })

  if (prettierFiles.length) {

    const fileLists = batchFileLists(prettierFiles, ',')

    for (const fileList of fileLists) {

      // https://prettier.io/docs/en/options.html
      // https://prettier.io/docs/en/cli.html#--cache
      commands.push({
        title: '..Running Prettier\n',
        command: `npx prettier --no-config --no-semi --single-quote --ignore-path ${prettierIgnorePath} --write --cache --cache-strategy metadata "{${fileList}}"`,
      })
    }
  }

  let hasPhp = false
  if (requirePhp) {
    try {
      await run('php --version', { silent: true, capture: true })
      hasPhp = true
    } catch (e) {
      console.log('..Skipping PHP Beautify - Command "php" not found')
    }
  }

  const titleDisplayed = {}

  await Promise.all(
    commands.map(function ({ type, title, command, ignoreCommandFailed }) {
      if (type === 'php' && !hasPhp) return

      if (!titleDisplayed[type]) {
        console.log(title)
        titleDisplayed[type] = true
      }

      // console.log(`..Running command: ${command}\n`)
      return run(command, {
        cwd: rootDir,
      }).catch((e) => {
        /**
         * Workaround for phpcbf returning with non-zero exit code even
         * when beautify completed successfully.
         */
        if (ignoreCommandFailed && e.message.indexOf('Command failed') === 0)
          return

        console.error(e.message)
      }) // Let other tasks complete
    })
  )
}

module.exports = format
