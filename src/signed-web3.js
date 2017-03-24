const sign = require("ethjs-signer").sign

const Web3 = require("web3")
const HttpProvider = require("web3/lib/web3/httpprovider")

// "raw" one will be used to talk to RPC server, only send/sendAsync overridden
const raw_httpProvider = new HttpProvider("http://localhost:8545")
const raw_web3 = new Web3(raw_httpProvider)

const signed_httpProvider = new HttpProvider("http://localhost:8545")
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

var currentId = 1234
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
        rawTx.nonce = getNonce(rawTx.from)
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

/**
 * Send async override
 * Adapted from https://github.com/ethjs/ethjs-provider-signer
 *
 * @method sendAsync
 * @param {payload} payload the input data payload
 * @param {Function} callback the send async callback
 * @callback {Object} output the XMLHttpRequest payload
 */
function sendAsync_spede(payload, callback) {
    // eslint-disable-line
    var self = this;
    if (payload.method !== 'eth_sendTransaction') {
        raw_httpProvider.sendAsync(payload, callback);
        return
    }
    
    // get the nonce, if any
    raw_httpProvider.sendAsync({
        jsonrpc: "2.0",
        id: currentId++,
        method: 'eth_getTransactionCount',
        params: [payload.params[0].from, 'latest']
    }, function (nonceError, nonceResponse) {
        // eslint-disable-line
        if (nonceError) {
            return callback(new Error('[ethjs-provider-signer] while getting nonce: ' + nonceError), null);
        }

        // get the gas price, if any
        raw_httpProvider.sendAsync({
            jsonrpc: "2.0",
            id: currentId++,
            method: 'eth_gasPrice'
        }, function (gasPriceError, gasPriceResponse) {
            // eslint-disable-line
            if (gasPriceError) {
                return callback(new Error('[ethjs-provider-signer] while getting gasPrice: ' + gasPriceError), null);
            }

            // build raw tx payload with nonce and gasprice as defaults to be overriden
            var rawTxPayload = Object.assign({
                nonce: nonceResponse.result + (+new Date()),
                gasPrice: gasPriceResponse.result,
                gas: "0x200000"
            }, payload.params[0]);

            // sign transaction with raw tx payload
            var signedHexPayload = signTransaction(rawTxPayload)

            // create new output payload
            var outputPayload = Object.assign({}, {
                id: payload.id,
                jsonrpc: payload.jsonrpc,
                method: 'eth_sendRawTransaction',
                params: [signedHexPayload]
            });

            // send payload
            raw_httpProvider.sendAsync(outputPayload, callback);
        });
    });
}
