import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { test, is, ok, run } from 'testra'

async function fileExists(file: string) {
  try {
    await fs.access(file)
    return true
  } catch (e) {
    return false
  }
}

type CommandResult = {
  code: number | null
  stdout: string
  stderr: string
  isError: boolean // return code is not 0
}

function runCommand(
  command: string,
  args: string[] = [],
  options: {
    timeout?: number
    verbose?: boolean
  } = {
    timeout: 0,
    verbose: true
  }
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'] // To parent process
    })

    let stdout = ''
    let stderr = ''

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString()
      if (options.verbose) process.stdout.write(data)
    })
    childProcess.stderr.on('data', (data) => {
      stderr += data.toString()
      if (options.verbose) process.stderr.write(data)
    })
    childProcess.on('close', (code) => {
      resolve({ code, stdout, stderr, isError: code !== 0 })
    })
    childProcess.on('error', (err) => {
      reject(err)
    })

    if (options.timeout) {
      setTimeout(() => childProcess.kill(), options.timeout)
    }

    return { stdout, stderr }
  })
}

let testConfig

test('Config', async () => {
  is(true, await fileExists('tangible.config.js'), 'config file exists')

  try {
    testConfig = await import('./tangible.config.js')
  } catch (e) {
    ok(false, 'config file can be imported')
    return
  }

  ok(true, 'config file can be imported')
  ok(testConfig.build, 'config has build property')
  ok(Array.isArray(testConfig.build), 'build property is an array')
})

test('CLI', async () => {
  let result: CommandResult
  let error: Error
  try {
    result = await runCommand('../run')
  } catch (e) {
    console.error(e)
    ok(false, 'runs with no arguments')
    return
  }

  ok(true, 'runs with no arguments')
  is(0, result.code, 'returns code 0 for success')
})

test('Build - Production', async () => {
  let result: CommandResult
  try {
    result = await runCommand('../run', ['build'])
  } catch (e) {
    console.error(e)
    ok(false, 'runs')
    return
  }

  ok(true, 'runs')
  is(0, result.code, 'returns code 0 for success')

  ok(await fileExists('build'), 'created build folder')

  ok(testConfig && Array.isArray(testConfig.build), 'build tasks exist')

  for (const task of testConfig.build) {
    if (task.dest) {
      ok(
        await fileExists(task.dest),
        `built target exists: ${task.dest}`
      )
    }
  }
})

test('Build - Development', async () => {
  let result: CommandResult
  try {
    result = await runCommand('../run', ['dev'], {
      timeout: 300 // Stop watching files
    })
  } catch (e) {
    console.error(e)
    ok(false, 'runs')
    return
  }

  ok(true, 'runs')
  is(143, result.code, 'returns code 143 for terminated process')
})

test('Install', async () => {

  ok(testConfig && typeof testConfig.install, 'install task exists')

  const { install } = testConfig

  let result: CommandResult
  try {
    result = await runCommand('../run', ['install'])
  } catch (e) {
    console.error(e)
    ok(false, 'runs')
    return
  }

  ok(true, 'runs')
  is(0, result.code, 'returns code 0 for success')

  for (const task of install) {
    if (task.dest) {
      ok(
        await fileExists(task.dest),
        `install target exists: ${task.dest}`
      )
    }
  }
})

test('Install - Development', async () => {

  ok(testConfig && typeof testConfig.installDev, 'installDev task exists')

  const { installDev } = testConfig

  let result: CommandResult
  try {
    result = await runCommand('../run', ['install', '--dev'])
  } catch (e) {
    console.error(e)
    ok(false, 'runs')
    return
  }

  ok(true, 'runs')
  is(0, result.code, 'returns code 0 for success')

  for (const task of installDev) {
    if (task.dest) {
      ok(
        await fileExists(task.dest),
        `install target exists: ${task.dest}`
      )
    }
  }
})

test('Archive', async () => {

  ok(testConfig && typeof testConfig.archive === 'object', 'archive task exists')

  const { archive } = testConfig

  let result: CommandResult
  try {
    result = await runCommand('../run', ['archive', '-y'])
  } catch (e) {
    console.error(e)
    ok(false, 'runs')
    return
  }

  ok(true, 'runs')
  is(0, result.code, 'returns code 0 for success')

  ok(await fileExists(archive.dest), `created archive ${archive.dest}`)
})

run()
