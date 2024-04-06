/**
 * Zip command: Create zip file from project
 */
const path = require('path')
const glob = require('fast-glob')
const fs = require('fs-extra')
const archiver = require('archiver')

module.exports = async function archive({ config }) {
  if (!config.archive) {
    console.log('Define property "archive" in tangible.config.js')
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
    rootFolder: archiveRootFolder,
  } = config.archive

  if (!src || !dest) {
    console.log('Required properties "src" and "dest"')
    return
  }

  const from = [...(Array.isArray(src) ? src : [src]), '.git', 'node_modules']

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
    ],
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

  // https://github.com/archiverjs/node-archiver
  const archivePath = path.join(rootDir, dest)
  const output = fs.createWriteStream(archivePath)
  const archive = archiver('zip')

  const archiveDir = path.dirname(archivePath)
  await fs.ensureDir(archiveDir)

  await new Promise((resolve, reject) => {
    output.on('close', function () {
      console.log(archive.pointer(), 'total bytes')
      resolve()
    })

    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        console.log(err)
      } else {
        reject(err) // throw err
      }
    })

    archive.on('error', function (err) {
      reject(err) // throw err
    })

    archive.pipe(output)

    for (const file of files) {
      const name = archive.file(path.join(rootDir, file), { name:
        archiveRootFolder
          ? path.join(archiveRootFolder, file)
          : file
      })
    }

    archive.finalize()
  })
}
