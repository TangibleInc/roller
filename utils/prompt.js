const readline = require('readline')

function prompt(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.on('SIGINT', function () {
      rl.close()
      resolve(false)
    })
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

module.exports = prompt
