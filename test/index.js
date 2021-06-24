import * as ReactDOM from 'react-dom'

const Test = () =>
  <div>Hello world!</div>

ReactDOM.render(<Test />, document.getElementById('root'))

console.log('React', React)
console.log('ReactDOM', ReactDOM)
