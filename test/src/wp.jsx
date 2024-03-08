/**
 * This file won't run as is, but is here to test that imports from
 * `@wordpress/*` are aliased to properties under the global variable `wp`.
 */
import { withSelect, withDispatch } from '@wordpress/data'
import { PluginDocumentSettingPanel } from '@wordpress/edit-post'

const Test = () => <div>Hello world!</div>

console.log('wp.data', withSelect, withDispatch)
console.log('wp.editPost', PluginDocumentSettingPanel)
console.log('Test', Test)
