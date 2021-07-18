
const args = process.argv.slice(2)

const createConfig = require('./config')
const createTaskConfigs = require('./config/task')

const commandName = args[0] || 'help'
const runCommand = require(`./commands/${commandName}`)

process.env.NODE_ENV = commandName==='dev' ? 'development' : 'production'

const config = createConfig({
  commandName
})

if (['dev', 'build'].indexOf( commandName ) >= 0) {

  console.log('Build for', process.env.NODE_ENV)

  if (commandName==='dev') {

    console.log('..Watching files for changes - Press CTRL+C to exit')

    if (config.serve) {
      require('./commands/serve')({ config })
    }
  }

  // Run command for each task

  const { tasks } = config

  Promise.all(tasks.map(function(task) {

    const taskConfigs = createTaskConfigs({ config, task })

    if ( ! taskConfigs ) {
      console.log(`Task not supported:`, task.src)
      return
    }

    return runCommand({
      config,
      task,
      ...taskConfigs
    })
      .catch(console.log)

  }))
    .catch(console.log)

} else {

  // Other commands

  runCommand({ config })
}
