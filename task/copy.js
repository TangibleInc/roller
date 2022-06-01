const path = require('path')
const glob = require('glob')
const fs = require('fs-extra')

module.exports = () => ({
  async build({ config, task = {} }) {

    const { src, dest } = task
    if (!src || !dest) return

    const {
      rootDir,
      isDev
    } = config

    const srcPath = path.join(rootDir, src)
    const destPath = path.join(rootDir, dest)

    const done = () => console.log('Copied',
      path.relative(rootDir, srcPath), 'to',
      path.relative(rootDir, destPath)
    )

    let stat
    try {
      stat = await fs.stat(srcPath)
      if (stat.isDirectory()) {
        // Copy directory
        await fs.copy(srcPath, destPath)
        done()
        return
      }
    } catch(e) {
      // OK
    }

    const files = await new Promise((resolve, reject) => {
      glob(srcPath, {
        cwd: rootDir,
        nodir: true, // Match files only
        follow: true // Follow symlinked directories
      }, function (err, files) {
        err ? reject(err) : resolve(files)
      })
    })

    if (!files.length) {
      return
    }

    // Determine source directory from given glob
    const srcDir = path.dirname(srcPath)
      .split('/')
      .filter(part => part.indexOf('*') < 0)
      .join('/')

    await Promise.all(files.map(file =>
      fs.copy(file, path.join(destPath, path.relative(srcDir, file))))
    )
      .catch(e => console.log('Error while copying:', e.message))

    done()
  }
})
