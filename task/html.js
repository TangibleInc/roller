import path from 'path'
import fsp from 'fs/promises'

import glob from 'fast-glob'
import { Eta } from 'eta'
import chokidar from 'chokidar'
// import getFileSize from '../utils/getFileSize.js'

async function buildHTML(props) {
  const { config, task, inputOptions, outputOptions, reloader } = props

  const { rootDir, isDev } = config

  const { src, dest } = task

  const templateData = !task.data
    ? {}
    : typeof task.data === 'function'
      ? await task.data(props)
      : task.data

  console.log('..Building from', src)

  const startTime = new Date()

  // Source directory base before **/*.html

  const srcDirParts = []

  let hasNestedSrcDirs = false // If true, corresponding folders will be created in dest
  let hasMultipleSrcFiles = false // If true, dest must specify dir name only (not file name)

  for (const part of src.split('/')) {
    if (part === '**') {
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

  const files = await glob(srcFullPath, {
    // https://github.com/mrmlnc/fast-glob#options-3
  })

  if (!files.length) {
    console.log('No matching files found:', src)
    return
  }

  let firstTime = true

  async function buildFile(file, logStart = true, logEnd = true) {
    let fileStartTime

    if (logStart) {
      console.log('..Building from', path.relative(rootDir, file))
    }
    if (logEnd) {
      fileStartTime = new Date()
    }

    // https://eta.js.org/docs/api
    const eta = new Eta()

    const dirPath = path.dirname(file)

    async function include(target) {

      // Resolve relative file path
      const filePath = path.resolve(dirPath, target)

      let content = ''
      try {
        content = await fsp.readFile(filePath, 'utf8')
      } catch (e) {
        console.log('Error building template', path.relative(rootDir, file))
        console.error(e.message)
      }

      return content
    }

    let content = ''
    try {
      content = await eta.renderStringAsync(
        await fsp.readFile(file, 'utf8'),
        templateData,
        {
          async: true,
          useWith: true,
          autoTrim: false,
          include,
        }
      )
    } catch (e) {
      console.error(e)
      return
    }

    if (reloader && reloader.active) {
      /**
       * Reloader client from lib/reloader/client.js
       */

      const clientInstance = reloader.clientScript.replace(
        '%WEBSOCKET_PORT%',
        reloader.port
      )

      if (content.indexOf('</body>') >= 0) {
        content = content.replace('</body>', clientInstance + '</body>')
      } else {
        content += clientInstance
      }
    }

    const destFileFullPath = path.join(
      destDir,
      destFileName && !hasMultipleSrcFiles
        ? destFileName
        : path.relative(srcDirBase, file)
    )

    // Ensure directory exists
    await fsp.mkdir(path.dirname(destFileFullPath), { recursive: true })

    await fsp.writeFile(destFileFullPath, content)

    if (logEnd) {
      const duration = new Date() - fileStartTime

      console.log(
        'Built',
        path.relative(rootDir, destFileFullPath)
        // , 'in', (duration / 1000).toFixed(2)+'s'
      )
    }

    if (isDev && !firstTime) reloader.reload()
  }

  // Build in parallel
  await Promise.all(files.map((f) => buildFile(f, false)))
  firstTime = false

  // Previously:
  // for (const file of files) {
  //   await buildFile(file)
  // }

  // Done

  const duration = new Date() - startTime
  const builtResult =
    path.relative(rootDir, destDir)
    + (hasNestedSrcDirs ? '/**/*.html' : '/' + (destFileName || '*.html'))

  // console.log('Built', builtResult, 'in', (duration / 1000).toFixed(2)+'s')

  if (!isDev) return

  // Watch files and rebuild

  const watcher = chokidar.watch(srcFullPath, {
    ignoreInitial: true, // Ignore initial "add" event
  })

  watcher
    .on('add', (file) => buildFile(file))
    .on('change', (file) => buildFile(file))
    .on('unlink', (file) => {
      // Remove destination file?
    })
}

export default () => ({
  build: buildHTML,
})
