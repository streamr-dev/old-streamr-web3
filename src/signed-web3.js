const sign = require("ethjs-signer").sign

const Web3 = require("web3")
const HttpProvider = require("web3/lib/web3/httpprovider")

// "raw" one will be used to talk to RPC server, only send/sendAsync overridden
const raw_httpProvider = new HttpProvider("https://rinkeby.infura.io")
const raw_web3 = new Web3(raw_httpProvider)

const signed_httpProvider = new HttpProvider("https://rinkeby.infura.io")
signed_httpProvider.send = send
signed_httpProvider.sendAsync = sendAsync
const signed_web3 = new Web3(signed_httpProvider)
signed_web3.streamr = {setKeyForAddress, signTransaction}

module.exports = signed_web3

function signTransaction(rawTx) {
    const key = keys[rawTx.from]
    if (!key) { throw new Error("Missing key for " + rawTx.from) }
    console.log(`signing ${JSON.stringify(rawTx)} with ${key}`)
    return sign(rawTx, key)
}

const keys = {}
function setKeyForAddress(address, key) {
    keys[address] = key
}

// ethjs-provider-signer only implements sendAsync below, so here's its sync version
function send(payload) {
    if (payload.method !== 'eth_sendTransaction') {
        return raw_httpProvider.send(payload)
    }

    // build raw tx payload with nonce and gasprice
    let rawTx = payload.params[0]
    if (!rawTx.nonce) {
        rawTx.nonce = getNonce(rawTx.from)
    }
    if (!rawTx.gasprice) {
        rawTx.gasPrice = raw_web3.eth.gasPrice
    }

    // sign transaction with raw tx payload
    var signedHexPayload = signTransaction(rawTx)

    return raw_httpProvider.send({
        id: payload.id,
        jsonrpc: payload.jsonrpc,
        method: 'eth_sendRawTransaction',
        params: [signedHexPayload]
    })
}

// keep track of the nonce of each account
// TODO: this seems hazardous, if transactions for the account could also be sent from elsewhere
var currentNonce = {}
function getNonce(account) {
    if (currentNonce[account] == null) {
        currentNonce[account] = raw_web3.eth.getTransactionCount(account, "latest")
    } else {
        currentNonce[account]++
    }
    return currentNonce[account]
}

function sendAsync(payload, callback) {
    // eslint-disable-line
    var self = this;
    if (payload.method !== 'eth_sendTransaction') {
        raw_httpProvider.sendAsync(payload, callback);
        return
    }

    // build raw tx payload with nonce and gasprice
    let rawTx = payload.params[0]
    if (!rawTx.nonce) {
        rawTx.nonce = getNonce(rawTx.from)  // TODO: should be just  raw_web3.eth.getTransactionCount(rawTx.from, "latest")
    }
    if (!rawTx.gasprice) {
        rawTx.gasPrice = raw_web3.eth.gasPrice
    }
    if (!rawTx.gas) {
        rawTx.gas = "0x200000"
    }

    // sign transaction with raw tx payload
    var signedHexPayload = signTransaction(rawTx)

    // send payload
    raw_httpProvider.sendAsync({
        id: payload.id,
        jsonrpc: payload.jsonrpc,
        method: 'eth_sendRawTransaction',
        params: [signedHexPayload]
    }, callback);
}
