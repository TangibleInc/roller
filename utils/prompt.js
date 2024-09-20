// https://nodejs.org/api/readline.html
import readline from 'readline'

export default function prompt(query = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.on('SIGINT', function () {
      rl.close()
      resolve(false) // Returns false on CTRL+C
    })
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}
