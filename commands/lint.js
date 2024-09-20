import format from './format.js'

export default async function lint(props) {
  return await format({
    ...props,
    lint: true,
  })
}
