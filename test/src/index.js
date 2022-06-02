import * as ReactDOM from 'react-dom'
import json from './index.json'

const Test = () => <div>Hello world!</div>

ReactDOM.render(<Test />, document.getElementById('root'))

console.log('React', React)
console.log('ReactDOM', ReactDOM)
console.log('JSON', json)
