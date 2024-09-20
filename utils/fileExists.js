import fs from 'fs/promises'

export default async function fileExists(file) {
  try {
    await fs.access(file)
    return true
  } catch (e) {
    return false
  }
}
