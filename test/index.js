const React = {
  createElement(...args) {
    return args
  },
  render(...args) {
    console.log('React.render', ...args)
  }
}

const Test = () =>
  <div>Hello world</div>

React.render(<Test />)
