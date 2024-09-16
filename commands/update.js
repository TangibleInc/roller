const installCommand = require('./install')

module.exports = async function updateCommand({ config }) {
  return await installCommand({
    config: {
      ...config,
      update: true
    }
  })
}