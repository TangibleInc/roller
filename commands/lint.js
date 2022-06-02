const format = require('./format')

async function lint(props) {
  return await format({
    ...props,
    lint: true
  })
}

module.exports = lint