const path = require('path')
const fsp = require('fs').promises

const glob = require('glob')
const eta = require('eta')
const chokidar = require('chokidar')
// const getFileSize = require('../utils/getFileSize')

async function buildHTML(props) {

  const {
    config,
    task,
    inputOptions,
    outputOptions
  } = props

  const {
    rootDir,
    isDev
  } = config

  const {
    src,
    dest
  } = task

  const templateData = !task.data
    ? {}
    : typeof task.data==='function'
      ? await task.data(props)
      : task.data


  console.log('..Building from', src)

  const startTime = new Date()


  // Source directory base before **/*.html

  const srcDirParts = []

  let hasNestedSrcDirs = false    // If true, corresponding folders will be created in dest
  let hasMultipleSrcFiles = false // If true, dest must specify dir name only (not file name)

  for (const part of src.split('/')) {
    if (part==='**') {
      hasNestedSrcDirs = true
      hasMultipleSrcFiles = true
      break
    }

    if (part.indexOf('.html') >= 0) {
      hasMultipleSrcFiles = part.indexOf('*') >= 0
      break
    }

    srcDirParts.push(part)
  }

  const srcFullPath = path.join(rootDir, src)
  const srcDirBase = path.join(rootDir, srcDirParts.join('/'))


  // Destination directory

  const destDirParts = []
  let destFileName

  for (const part of dest.split('/')) {
    if (part.indexOf('.html') >= 0) {
      destFileName = part
      break
    }
    destDirParts.push(part)
  }

  const destDir = path.join(rootDir, destDirParts.join('/'))


  // Get and transform files

  const files = await new Promise((resolve, reject) => {
    glob(srcFullPath, {}, function (err, files) {
      err ? reject(err) : resolve(files)
    })
  })

  if (!files.length) {
    console.log('No matching files found:', src)
    return
  }

  async function buildFile(file, log = false) {

    let fileStartTime

    if (log) {
      fileStartTime = new Date()
      console.log('..Building from', path.relative(rootDir, file))
    }

    // https://eta.js.org/docs/syntax/async
    const content = await eta.render(
      await fsp.readFile(file, 'utf8'),
      templateData,
      { async: true }
    )

    const destFileFullPath = path.join(
      destDir,
      (destFileName && !hasMultipleSrcFiles)
        ? destFileName
        : path.relative(srcDirBase, file)
    )

    // Ensure directory exists
    await fsp.mkdir(
      path.dirname(destFileFullPath),
      { recursive: true }
    )

    await fsp.writeFile(destFileFullPath, content)

    if (log) {

      const duration = new Date() - fileStartTime

      console.log('Built', path.relative(rootDir, destFileFullPath), 'in',
        (duration / 1000).toFixed(2)+'s'
      )
    }
  }

  for (const file of files) {
    await buildFile(file)
  }


  // Done

  const duration = new Date() - startTime
  const builtResult = path.relative(rootDir, destDir) + (
    hasNestedSrcDirs ? '/**/*.html' : ('/' + (destFileName || '*.html'))
  )

  console.log('Built', builtResult, 'in', (duration / 1000).toFixed(2)+'s')


  if (!isDev) return

  // Watch files and rebuild

  const watcher = chokidar.watch(srcFullPath, {
    ignoreInitial: true // Ignore initial "add" event
  })

  watcher
    .on('add', file => buildFile(file, true))
    .on('change', file => buildFile(file, true))
    .on('unlink', file => {
      // Remove destination file?
    })


}

module.exports = () => ({ build: buildHTML })