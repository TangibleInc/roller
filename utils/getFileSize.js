
const fs = require('fs')

async function getFileSize(filename) {
  const stats = await fs.promises.stat(filename)
  const { size } = stats
  const i = Math.floor(Math.log(size) / Math.log(1024))
  return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i]
}

module.exports = getFileSize