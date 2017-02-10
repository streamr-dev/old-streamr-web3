# streamr-web3
Streamr Ethereum bridge

Needs to be running in the background so that Ethereum modules will work.

## Dependencies

* [Node.js](https://docs.npmjs.com/getting-started/installing-node)
 * `brew install node`, `npm install npm@latest -g`, ...
* [TestRPC Ethereum dummy-client/simulator](https://github.com/ethereumjs/testrpc)
 * `npm install -g ethereumjs-testrpc`
 
## Running

First console window:
* `testrpc`

Second console window:
* `npm install`
* `npm start`

## Running tests

First console window:
* `testrpc`

Second console window:
* `mocha`
