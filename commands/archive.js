/**
 * Archive command: Create a zip package of the project
 */
const path = require('path')
const url = require('url')
const glob = require('fast-glob')
const fs = require('fs-extra')
const { Zip } = require('zip-lib')
const fileExists = require('../utils/fileExists')

module.exports = async function archive({ config }) {
  if (!config.archive) {
    console.log('Required property "archive" in tangible.config.js')
    console.log(`Example:
{
  archive: {
    src: [
      '**/*',
      '!**/src',
      '!**/test'
    ],
    dest: 'build/project.zip'
  }
}
`)
    return
  }

  const { rootDir } = config
  const {
    src,
    dest,
    exclude = [],
    rootFolder: archiveRootFolder = config.archive.root, // Alias
    configs = [],
  } = config.archive

  if (!src || !dest) {
    console.log('Required properties "src" and "dest"')
    return
  }

  for (const childConfig of configs) {
    const childConfigPath = path.join(rootDir, childConfig)
    const relativeChildRootPath = path.relative(rootDir, path.dirname(childConfigPath))

    /**
     * ES Module loading with abolute path fails on Windows unless it's
     * converted to URL: https://github.com/nodejs/node/issues/31710
     */
    const configJsPathUrl = url.pathToFileURL(childConfigPath).href

    let configJson = {}
    try {
      configJson = (await import(configJsPathUrl)).default
    } catch (e) {
      console.warn('Child config not found', childConfigPath)
    }

    const relativeToChildFolder = (pattern) =>
      `${relativeChildRootPath}/${pattern.replace('^/', '')}`

    src.push(...(configJson?.archive?.src ?? []).map(relativeToChildFolder))
    exclude.push(...(configJson?.archive?.exclude ?? []).map(relativeToChildFolder))
  }

  const files = await glob(src, {
    cwd: rootDir,
    ignore: [
      ...exclude,
      'artifacts',
      'bun.lockb',
      'composer.lock',
      '.git*',
      '.idea',
      'node_modules',
      'package-lock.json',
      '.phpunit.cache',
      'publish',
      '.wp-env.json',
      '.wp-env.override.json',
      'yarn.lock',
    ].map((f) => (!f.startsWith('/') && !f.startsWith('./') ? '**/' + f : f)),
  })

  console.log('Files to archive:', files)

  console.log('Archive file:', dest)

  function waitKeyPressed() {
    return new Promise((resolve) => {
      // const wasRaw = process.stdin.isRaw
      // process.stdin.setRawMode(true) // Single key press instead of line
      process.stdin.resume()
      process.stdin.once('data', (data) => {
        process.stdin.pause()
        // process.stdin.setRawMode(wasRaw)
        resolve(data.toString())
      })
    })
  }

  console.log('Press enter to continue, or CTRL + C to stop')
  await waitKeyPressed()

  /**
   * https://github.com/fpsqdb/zip-lib
   */

  const zip = new Zip()
  const archivePath = path.join(rootDir, dest)

  await fs.mkdir(path.dirname(archivePath), {
    recursive: true, // Ensure parent directories, and no error when dir exists
  })

  if (await fileExists(archivePath)) {
    await fs.rm(archivePath)
  }

  await new Promise((resolve, reject) => {
    for (const file of files) {
      const sourceFile = path.join(rootDir, file)
      const targetFile = archiveRootFolder
        ? path.join(archiveRootFolder, file)
        : file
      zip.addFile(sourceFile, targetFile)
    }

    zip.archive(archivePath).then(resolve, reject)
  })
}
