const path = require('path')
const fs = require('fs/promises')
const { Readable } = require('stream')
const { extract } = require('zip-lib')
const run = require('../utils/run')
const fileExists = require('../utils/fileExists')

/**
 * Install dependencies from Git repository or zip file URL
 */
module.exports = async function ({ config }) {

  const { cwd, install } = config

  if (!install) {
    console.log('Required property "install" in tangible.config.js')
    return
  }

  const shouldUpdate = false

  const vendorPath = path.join(cwd, 'vendor', 'tangible')

  for (const { git, branch = 'main', url } of install) {
    // Git repository
    if (git) {

      const slug = git
        .split('/')
        .pop()
        .replace(/\.git$/, '')

      const targetPath = path.join(vendorPath, slug)

      if (await fileExists(targetPath)) {

        const command = `git pull ${git} ${branch}`
        console.log(command)

        await run(command, {
          cwd: targetPath,
        })
 
      } else {

        const command = `git clone --recursive --depth 1 --single-branch --branch ${branch} ${git}`
        console.log(command)

        await run(command, {
          cwd: vendorPath,
        })
      }

      continue
    }

    // Zip file URL
    if (url) {

      const slug = url
        .split('/')
        .pop()
        .replace('.latest-stable.zip', '')
        .replace(/\.zip$/, '')
    
      const zipFilePath = path.join(vendorPath, slug + '.zip')
      const folderPath = path.join(vendorPath, slug)

      if (await fileExists(folderPath)) {

        if (shouldUpdate) {
          console.log('Removing existing folder', slug)
          await fs.rm(folderPath, {
            recursive: true
          })

        } else {
          console.log('Folder exists', folderPath)
          continue
        }
      }

      console.log('Downloading', url)

      const response = await fetch(url)
      const body = Readable.fromWeb(response.body)
      await fs.writeFile(zipFilePath, body)

      console.log('Extracting', zipFilePath)

      await extract(zipFilePath, vendorFolder)
      await fs.rm(zipFilePath)

      continue
    }
  }
}
