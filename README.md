# Streamr-Web3: Streamr-Ethereum bridge
An optional service of the Streamr cloud architecture that facilitates interactions with the Ethereum blockchain.
Engine-and-Editor's Ethereum modules require this service to be active in order to work.

![Where Streamr-Web3 sits in Streamr cloud stack](high-level.png)

## Dependencies

* [Node.js](https://docs.npmjs.com/getting-started/installing-node)
* [TestRPC Ethereum dummy-client/simulator](https://github.com/ethereumjs/testrpc)

## Building

Project uses npm for package management. We provide sensible default configurations for IntelliJ IDEA but project can be
developed with other IDEs as well.

- Make sure tools from section *Dependencies* have been installed.
- Install npm dependencies with `npm install`
- To run tests open two console windows. Run `testrpc` on the 1st and `mocha` on the 2nd console.
 
## Running

First console window
```
testrpc
```

Second console window
```
npm start
```

## Publishing

Currently project has no CI system and/or container configured nor are any packages published to npmjs.com. 

## License

This software is open source, and dual licensed under [AGPLv3](https://www.gnu.org/licenses/agpl.html) and an enterprise-friendly commercial license.
