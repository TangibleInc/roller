const createConfig = require('./config')
const createTaskConfigs = require('./task')
const createReloader = require('./lib/reloader')

const supportedCommands = [
  'build', 'dev', 'format', 'help', 'lint', 'serve'
]

;(async function run(commandName) {

  if (supportedCommands.indexOf(commandName) < 0) {
    commandName = 'help'
  }

  const runCommand = require(`./commands/${commandName}`)

  if (!runCommand instanceof Function) return

  process.env.NODE_ENV = commandName==='dev' ? 'development' : 'production'

  const config = createConfig({
    commandName
  })

  if (['dev', 'build'].indexOf( commandName ) < 0) {
    // Other commands
    return runCommand({ config })
  }

  console.log('Build for', process.env.NODE_ENV)

  // Prepare tasks

  const { tasks } = config

  tasks.forEach(function(task, index) {

    if (task instanceof Function) {
      tasks[index] = {
        task: 'custom',
        build: task
      }
      return
    }

    if (!task.task && task.src) {

      // Determine task type from src file extension

      const extension = task.src.split('.').pop()

      task.task = extension==='scss'
        ? 'sass'
        : extension==='html'
          ? 'html'
          : ['js', 'jsx', 'ts', 'tsx'].indexOf(extension) >= 0
            ? 'js'
            : undefined
    }
  })

  const reloader = await createReloader({
    commandName,
    config,
    tasks
  })

  // Run tasks in parallel
  Promise.all(tasks.map(function(task) {

    const taskConfigs = createTaskConfigs({ config, task })

    if ( ! taskConfigs ) {
      console.log(`Task not supported:`, task)
      return
    }

    return runCommand({
      config,
      task,
      reloader,
      ...taskConfigs
    })
      .catch(console.log)

  }))
    .then(async function() {

      // All tasks done

      if (commandName!=='dev') return

      if (reloader.active) {
        reloader.startServer()
      }

      if (config.serve) {
        await require('./commands/serve')({
          config,
          reloader
        })
      }

      console.log('..Watching files for changes - Press CTRL+C to exit')
    })
    .catch(console.log)

})(
  process.argv.slice(2)[0] || 'help'
).catch(console.error)
