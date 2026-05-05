import commonjs from '@rollup/plugin-commonjs'
import {nodeResolve} from '@rollup/plugin-node-resolve'

export default {
    input: 'out/main.js',
    output: {
        dir: 'dist',
        format: 'es'
    },
    context: 'globalThis',
    plugins: [commonjs(), nodeResolve()]
}
