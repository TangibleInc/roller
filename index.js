const createConfig = require('./config')
const createTaskConfigs = require('./task')
const createReloader = require('./lib/reloader')

const supportedCommands = ['build', 'dev', 'format', 'help', 'lint', 'serve']

;(async function run(commandName = 'help', ...args) {
  if (supportedCommands.indexOf(commandName) < 0) {
    commandName = 'help'
  }

  const runCommand = require(`./commands/${commandName}`)

  if (!(runCommand instanceof Function)) return

  process.env.NODE_ENV = commandName === 'dev' ? 'development' : 'production'

  // Support specifying more than one project
  if (args.length > 1) {

    if (['build', 'format'].indexOf(commandName) < 0) {
      console.log(`Command "${commandName}" does not support more than one project`)
      process.exit(1)
    }

    const rootDir = process.cwd()

    for (const arg of args) {
      console.log(`\nProject "${arg}"\n`)
      const config = createConfig({
        commandName,
        args: [arg],
      })

      await runWithConfig({
        commandName,
        runCommand,
        config,
      })

      process.chdir(rootDir)
    }
    return
  }

  const config = createConfig({
    commandName,
    args,
  })

  await runWithConfig({
    commandName,
    runCommand,
    config,
  })
})(...process.argv.slice(2)).catch(console.error)

async function runWithConfig({ commandName, runCommand, config }) {
  if (['dev', 'build'].indexOf(commandName) < 0) {
    // Other commands
    return runCommand({ config })
  }

  console.log('Build for', process.env.NODE_ENV)

  // Prepare tasks

  const { tasks } = config

  tasks.forEach(function (task, index) {
    if (task instanceof Function) {
      tasks[index] = {
        task: 'custom',
        build: task,
      }
      return
    }

    if (!task.task && task.src) {
      // Determine task type from src file extension

      const extension = task.src.split('.').pop()

      task.task =
        extension === 'scss'
          ? 'sass'
          : extension === 'html'
          ? 'html'
          : ['js', 'jsx', 'ts', 'tsx'].indexOf(extension) >= 0
          ? 'js'
          : undefined
    }
  })

  const reloader = await createReloader({
    commandName,
    config,
    tasks,
  })

  // Run tasks in parallel
  return Promise.all(
    tasks.map(function (task) {
      const taskConfigs = createTaskConfigs({ config, task })

      if (!taskConfigs) {
        console.log(`Task not supported:`, task)
        return Promise.resolve() // Let other tasks continue
      }

      return runCommand({
        config,
        task,
        reloader,
        ...taskConfigs,
      }).catch(console.log)
    })
  )
    .then(async function () {
      // All tasks done

      if (commandName !== 'dev') return

      if (reloader.active) {
        reloader.startServer()
      }

      if (config.serve) {
        await require('./commands/serve')({
          config,
          reloader,
        })
      }

      console.log('..Watching files for changes - Press CTRL+C to exit')
    })
    .catch(console.log)
}
