var _ = require("lodash")
var rest = require("restling");
var debug = require('debug')('getContractAt')

const web3 = require("./signed-web3")

// Get one from https://etherscan.io/myapikey (testnet seems to work without)
//const API_KEY = process.env.ETHERSCAN_API_KEY

etherscanServer = {
    undefined: "https://api.etherscan.io",
    "mainnet": "https://api.etherscan.io",
    "rinkeby": "https://rinkeby.etherscan.io",
    "ropsten": "https://ropsten.etherscan.io",
}

function getContractAt(address, networkName) {
    if (!address) { throw new Error("'at' query parameter required (contract address)") }
    var bytecode = web3.eth.getCode(address)
    if (bytecode.length < 3) { throw new Error("no contract at " + address) }
    var serverUrl = etherscanServer[networkName]

    // TODO: Query https://etherscan.io/apis#contracts
    var url = `${serverUrl}/api?module=contract&action=getabi&address=${address}`//&apikey=${API_KEY}`
    return rest.get(url).then((response) => {
        debug(`Response from ${url}: ${response.data}`)
        if (response.data.result == "") {
            return {address}
        } else {
            return {address, abi: JSON.parse(response.data.result)}
        }
    })
}

module.exports = getContractAt
