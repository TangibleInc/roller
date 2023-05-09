function kebabToCamel(string) {
  return string.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

module.exports = kebabToCamel