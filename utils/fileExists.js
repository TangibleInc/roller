const fs = require('fs/promises')

const fileExists = async (file) => {
  try {
    await fs.access(file)
    return true
  } catch (e) {
    return false
  }
}

module.exports = fileExists