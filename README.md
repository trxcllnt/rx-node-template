rx-node-template
====

###Setup

0. `git clone https://github.com/trxcllnt/rx-node-template.git`
1. `npm install`
2. `node server`
3. http://localhost:5000

###Command-line options
- `node server --env dev` starts a server that recompiles the client source on each request to the root (http://localhost:5000)
- `node server --env prod` starts a server that only serves the built JS, doesn't recompile on each request.
- `node build --env prod` builds the client source for production.
- `node build --env dev` builds the client source with source-maps for debugging.

###Application modules
Declare your app's modules in the `package.json` file as `name: src` key-value pairs. Later, instead of doing `require('../..i/hate/relative/paths/to/my_module')`, you can do `require('my_module')` instead.
