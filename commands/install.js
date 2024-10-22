import path from 'path'
import fs from 'fs/promises'
import { Readable } from 'stream'
import { extract } from 'zip-lib'
import run from '../utils/run.js'
import fileExists from '../utils/fileExists.js'
import prompt from '../utils/prompt.js'

/**
 * Install dependencies from Git repository or zip file URL
 */
export default async function installCommand({ config }) {
  const { cwd, install = [], installDev = [] } = config

  if (!install) {
    console.log('Required property "install" in tangible.config.js')
    console.log(config)
    return
  }

  const args = process.argv.slice(2)
  const shouldUpdate = config.update || args.indexOf('--update') >= 0
  const shouldInstallDev = args.indexOf('--dev') >= 0
  const skipPrompt = args.indexOf('-y') >= 0
  const dirsCreated = {}

  const deps = [...install, ...(shouldInstallDev ? installDev : [])]

  for (const { git, branch = 'main', zip, dest } of deps) {
    if (!dest) {
      console.error('Property "dest" required', git || zip)
      continue
    }

    const parts = dest.split('/')
    const folderName = parts.pop()
    const parentPath = path.join(cwd, ...parts)

    // Ensure parent folder exists
    if (!dirsCreated[parentPath] && !(await fileExists(parentPath))) {
      console.log('Create parent folder', parts.join('/'))
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
      const relativeFolderPath = path.relative(cwd, targetPath)

      // Fallback to HTTPS instead of Git/SSH protocol
      const fallbackGit = git.replace('git@github.com:', 'https://github.com/')

      async function runWithFallback(command, givenOptions = {}) {
        const options = {
          cwd: givenOptions.cwd || parentPath,
        }
        // console.log('Running command in path', options.cwd)
        try {
          console.log(command)
          await run(command, options)
        } catch (e) {
          if (git === fallbackGit) {
            console.log('Git clone failed')
            console.error(e)
          } else {
            console.log(
              "Git did't work with SSH protocol. Trying fallback with HTTPS.",
            )
            const fallbackCommand = command.replace(git, fallbackGit)
            console.log(fallbackCommand)
            await run(fallbackCommand, options)
          }
        }
      }

      if (await fileExists(targetPath)) {
        if (!shouldUpdate) {
          console.log('Folder exists', relativeFolderPath)
          continue
        }
        console.log('Update existing folder', relativeFolderPath)

        await runWithFallback(`git pull --ff-only ${git} ${branch}`, {
          cwd: targetPath,
        })
      } else {
        await runWithFallback(
          `git clone --recursive --depth 1 --single-branch --branch ${branch} ${git} ${folderName || slug}`,
          {
            cwd: parentPath,
          },
        )
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
      const targetPath = path.join(parentPath, folderName || slug)
      const relativeFolderPath = path.relative(cwd, targetPath)

      if (await fileExists(targetPath)) {
        if (!shouldUpdate) {
          console.log('Folder exists', relativeFolderPath)
          continue
        }
        console.log('Replace existing folder', relativeFolderPath)
        const answer = skipPrompt
          ? false
          : await prompt(`Enter "y" to continue, or nothing to skip: `)
        if (answer === false) {
          // CTRL+C
          console.log()
          process.exit()
        }
        if (answer !== 'y') {
          // Cancelled
          continue
        }
        await fs.rm(targetPath, {
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
