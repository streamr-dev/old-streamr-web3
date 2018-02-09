# Streamr-Web3: Streamr-Ethereum bridge
An optional service of the Streamr cloud architecture that facilitates interactions with the Ethereum blockchain. Engine-and-Editor's Ethereum modules require this service to be active in order to work.

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

## License

This software is open source, and dual licensed under [AGPLv3](https://www.gnu.org/licenses/agpl.html) and an enterprise-friendly commercial license.
