
const args = process.argv.slice(2)

const createConfig = require('./config')
const createTaskConfigs = require('./config/task')

const commandName = args[0] || 'help'
const runCommand = require(`./commands/${commandName}`)

const config = createConfig()

if (['dev', 'build'].indexOf( commandName ) >= 0) {

  process.env.NODE_ENV = commandName==='dev' ? 'development' : 'production'

  console.log('Build for', process.env.NODE_ENV)

  if (commandName==='dev' && config.serve) {
    require('./commands/serve')(config)
  }

  // Run command for each task

  const { tasks } = config

  Promise.all(tasks.map(function(task) {

    const taskConfigs = createTaskConfigs(config, task)

    if ( ! taskConfigs ) {
      console.log(`Task type "${task.task}" not supported`)
      return
    }

    return runCommand(config, ...taskConfigs)
      .catch(console.log)

  }))
    .catch(console.log)

} else {

  // Other commands

  runCommand(config)
}
