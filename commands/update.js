import installCommand from './install.js'

export default async function updateCommand({ config }) {
  return await installCommand({
    config: {
      ...config,
      update: true
    }
  })
}