var _ = require("lodash")

var Web3 = require("web3")
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'))

function getContractAt(address) {
    if (!address) { return Promise.reject("'at' query parameter required (contract address)") }
    var bytecode = web3.eth.getCode(address)
    if (bytecode.length < 3) { return Promise.reject("no contract at " + address) }

    // TODO: Query https://etherscan.io/apis#contracts

    return Promise.resolve({address})
}

module.exports = getContractAt
