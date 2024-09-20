import fs from 'fs'

export default async function getFileSize(filename) {
  try {
    const stats = await fs.promises.stat(filename)
    const { size } = stats

    const i = Math.floor(Math.log(size) / Math.log(1024))
    return (
      (size / Math.pow(1024, i)).toFixed(2) * 1 +
      ' ' +
      ['B', 'KB', 'MB', 'GB', 'TB'][i]
    )
  } catch (e) {
    return 'NOT FOUND'
  }
}
