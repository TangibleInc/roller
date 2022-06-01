const createConfig = require('./config')
const createTaskConfigs = require('./task')
const createReloader = require('./lib/reloader')

run( process.argv.slice(2)[0] || 'help' )
  .catch(console.error)

async function run(commandName) {

  const runCommand = require(`./commands/${commandName}`)

  process.env.NODE_ENV = commandName==='dev' ? 'development' : 'production'

  const config = createConfig({
    commandName
  })

  if (['dev', 'build'].indexOf( commandName ) < 0) {
    // Other commands
    runCommand({ config })
    return
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

      if (commandName==='dev') {

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
      }
    })
    .catch(console.log)


}
