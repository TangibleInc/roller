const path = require('path')
const fs = require('fs/promises')
const { Readable } = require('stream')
const { extract } = require('zip-lib')
const run = require('../utils/run')
const fileExists = require('../utils/fileExists')
const prompt = require('../utils/prompt')

/**
 * Install dependencies from Git repository or zip file URL
 */
module.exports = async function installCommand({ config }) {
  const { cwd, install } = config

  if (!install) {
    console.log('Required property "install" in tangible.config.js')
    console.log(config)
    return
  }

  const shouldUpdate =
    config.update ?? process.argv.slice(2).indexOf('update') >= 0
  // process.argv
  //   .slice(2)
  //   .reduce((result, arg) => result || arg === '--update', false)
  const dirsCreated = {}

  for (const { git, branch = 'main', zip, dest } of install) {
    if (!dest) {
      console.error('Property "dest" required', install)
      continue
    }

    const parts = dest.split('/')
    const folderName = parts.pop()
    const parentPath = path.join(cwd, ...parts)

    // Ensure parent older exists
    if (!dirsCreated[parentPath]) {
      await fs.mkdir(parentPath, { recursive: true })
      dirsCreated[parentPath] = true
    }

    // Git repository
    if (git) {
      const slug = git
        .split('/')
        .pop()
        .replace(/\.git$/, '')

      const targetPath = path.join(parentPath, folderName)

      if (await fileExists(targetPath)) {
        const command = `git pull ${git} ${branch}`
        console.log(command)

        await run(command, {
          cwd: targetPath,
        })
      } else {
        const command = `git clone --recursive --depth 1 --single-branch --branch ${branch} ${git} ${folderName || slug}`
        console.log(command)

        await run(command, {
          cwd: parentPath,
        })
      }

      continue
    }

    // Zip file URL
    if (zip) {
      const slug = zip
        .split('/')
        .pop()
        .replace('.latest-stable.zip', '')
        .replace(/\.zip$/, '')

      const zipFilePath = path.join(parentPath, slug + '.zip')
      const folderPath = path.join(parentPath, folderName || slug)
      const relativeFolderPath = path.relative(cwd, folderPath)

      if (await fileExists(folderPath)) {
        if (!shouldUpdate) {
          console.log('Folder exists', relativeFolderPath)
          continue
        }
        console.log('Replace existing folder', relativeFolderPath)
        const answer = await prompt(
          `Enter "y" to continue, or nothing to skip: `,
        )
        if (answer === false) {
          // CTRL+C
          console.log()
          process.exit()
        }
        if (answer !== 'y') {
          // Cancelled
          continue
        }
        await fs.rm(folderPath, {
          recursive: true,
        })
      }

      console.log('Downloading', zip)

      const response = await fetch(zip)
      const body = Readable.fromWeb(response.body)
      await fs.writeFile(zipFilePath, body)

      console.log('Extracting to', relativeFolderPath)

      await extract(zipFilePath, parentPath)
      await fs.rm(zipFilePath)

      // TODO: Rename in case extracted folder is named differently

      continue
    }
  }
}
