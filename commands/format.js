const path = require('path')
const { execSync } = require('child_process')

const glob = require('fast-glob')
const fs = require('fs-extra')

const prettierIgnorePath = path.resolve(
  path.join(__dirname, '..', 'config', '.prettierignore')
)

const phpLibPath = path.resolve(
  path.join(__dirname, '..', 'lib', 'php')
)
const phpcbfPath =   path.join(phpLibPath, 'phpcbf.phar')
const phpcsPath =    path.join(phpLibPath, 'phpcs.phar')
const wpcsPath =     path.join(phpLibPath, 'wpcs')
const standardPath = path.join(phpLibPath, 'phpcs.xml')

const run = (cmd, options = {}) => new Promise((resolve, reject) => {

  const {
    silent = false,
    capture = false,
    cwd = process.cwd()
  } = options

  // if (!silent && !capture) console.log(cmd)

  try {
    const result = capture
      ? execSync(cmd, { stdio: 'pipe', cwd }).toString()
      : execSync(cmd, { stdio: 'inherit', cwd })

    if (capture) return resolve(result)
    if (result && !silent) console.log(result)
    resolve()

  } catch(e) {
    // if (capture) return reject(e.message)
    // if (e.message && !silent) console.error(e.message)
    reject(e)
  }
})

async function format({
  config,
  lint = false
}) {

  if (!config.format) {
    console.log(
`Format command requires the "format" property in the config file

It is a string or an array of path patterns to match. Use * as wildcard, ** to match any directory levels, and ! to exclude pattern. Use {} and a comma-separated list to match multiple items.

Example - All files in directory

format: 'src'

Example - Static site

format: 'src/**/*.{html,js,scss}'

Example - Plugin

format: [
  'assets/src/**/*.{js,scss}',
  '**/*.php',
  '!vendor/**'
]
`
)
    return
  }

  const { rootDir } = config
  const knownTypes = ['html', 'js', 'json', 'php', 'scss']

  let filesPattern = config.format

  if (filesPattern.indexOf('*') < 0 && fs.existsSync(filesPattern)) {
    // All files in a directory
    filesPattern = `${filesPattern}/**/*.{${knownTypes.join(',')}}`
  }

  const files = await glob(filesPattern, {
    cwd: rootDir
  })

  // Organize by file extensions
  const filesByType = files.reduce(function(obj, file) {
    const extension = file.split('.').pop()
    if (knownTypes.indexOf(extension) < 0) return
    if (!obj[extension]) obj[extension] = []
    obj[extension].push(file)
    return obj
  }, {})

  const commands = []
  const prettierFiles = []

  Object.keys(filesByType).forEach(type => {
    if (type!=='php') {
      if (lint) return // No lint for JS, Sass, etc.
      prettierFiles.push(...filesByType[type])
      return
    }
    /**
     * PHP_CodeSniffer requires the following PHP extensions to be enabled: Tokenizer, SimpleXML, XMLWriter
     *
     * sudo apt-get install php7.4-xml
     * php -i | grep "xml"
     *
     * https://github.com/squizlabs/PHP_CodeSniffer/wiki/Requirements
     * https://github.com/squizlabs/PHP_CodeSniffer/wiki/Usage
     */
    commands.push(`php ${
      lint ? phpcsPath : phpcbfPath
    } -v -s --colors --extensions=php --runtime-set installed_paths ${wpcsPath} --standard=${standardPath} ${
      filesByType[type].map(f => path.relative(rootDir, f)).join(' ')
    } || true`)
  })

  if (prettierFiles.length) {
    // https://prettier.io/docs/en/options.html
    commands.push(`npx prettier --no-config --no-semi --single-quote --ignore-path ${prettierIgnorePath} --write "{${prettierFiles
      // .map(f => f.replace(/"/g, '\"')) // Escape quotes just in case
      .join(',')}}"`)
  }

  await Promise.all(commands.map(function(command) {
    console.log(`..Running command: ${command}\n`)
    return run(command, {
      cwd: rootDir
    })
      .catch(e => console.error(e.message)) // Let others complete
  }))
}

module.exports = format