const _ = require("lodash")
const web3 = require("./signed-web3")
const Promise = require("bluebird")

const SolidityEvent = require("web3/lib/web3/event.js")
const SolidityCoder = require("web3/lib/solidity/coder.js")

const BN = require("bignumber.js")

const THROW_ERROR_MESSAGE = "transaction rolled back after 'throw'"

const ETHEREUM_TIMEOUT_MS = 30 * 60 * 1000

// try to cast bytes into BigNumber; if not possible, just use as-is
function convertHex(bytesArg) {
    try {
        if (_.isArray(bytesArg)) {
            // convert all or nothing
            return bytesArg.map(getHex)
        } else {
            return getHex(bytesArg)
        }
    } catch (e) {
        return bytesArg
    }
}

// throws if string isn't valid hex
function getHex(string) {
    if (string.startsWith("0x")) {
        return new BN(string)
    } else {
        return new BN("0x" + string)
    }
}

function ethCall(from, to, abi, functionName, args, value, gas, gasPrice) {
    if (typeof from != "string") { throw new Error("Must specify sender account (from:address)") }
    if (typeof to != "string") { throw new Error("Must specify target address (to:address)") }
    if (!abi) { throw new Error("Missing contract interface (abi:json)") }
    if (!functionName) { throw new Error("Missing function name (function:string)") }
    if (!args) { args = [] }
    if (!value) { value = 0 }
    if (!gas) { gas = 4000000 }
    if (!gasPrice) { gasPrice = 2e9 }
    to = to.trim()

    const contract = web3.eth.contract(abi).at(to)
    const func = contract[functionName]
    if (!func) { throw new Error(functionName + " not found in contract!") }

    const functionMetadata = _(abi).find(m => m.type === "function" && m.name === functionName)
    if (!functionMetadata) { throw new Error(functionName + " not found in ABI") }

    // bytes, bytesXX, bytes[], bytes[X] special handling
    const modifiedArgs = _.zip(functionMetadata.inputs, args).map(([input, arg]) =>
        input.type.startsWith("bytes") ? convertHex(arg) : arg)

    if (functionMetadata.constant) {
        const res = func.call(...modifiedArgs)
        console.log("Called " + functionName + ", got result " + JSON.stringify(res))
        const results = functionMetadata.outputs.length === 1 ? [res] : res
        return Promise.resolve({ results })
    } else {
        return transactionPromise(from, to, abi, () => {
            let callParams = {from, value, gas}
            if (gasPrice) { callParams.gasPrice = gasPrice }
            return Promise.promisify(func.sendTransaction)(...modifiedArgs, callParams)
        })
    }
}

// send ether, no function call
function ethSend(from, to, value, gasPrice) {
    if (typeof from != "string") { throw new Error("Must specify sender account (from:address)") }
    if (typeof to != "string") { throw new Error("Must specify target address (to:address)") }
    if (!(value > 0)) { throw new Error("Must specify ether amount to send (value:wei)") }

    return transactionPromise(from, to, null, () => {
        let callParams = {from, to, value}
        if (gasPrice) { callParams.gasPrice = gasPrice }
        return Promise.promisify(web3.eth.sendTransaction)(callParams)
    })
}

// fetch events from tx according to ABI
function getEvents(abi, address, tx) {
    const tr = web3.eth.getTransactionReceipt(tx)
    return getEventsFromLogs(tr.logs, JSON.parse(abi), address)
}


function transactionPromise(from, to, abi, getTransaction) {
    const srcBalanceBefore = web3.eth.getBalance(from)
    const dstBalanceBefore = web3.eth.getBalance(to)
    return getTransaction().then(tx => {
        const tr = web3.eth.getTransactionReceipt(tx)
        if (tr) {
            console.log("Got receipt: " + JSON.stringify(tr))
            return {srcBalanceBefore, dstBalanceBefore, tx, tr}
        } else {
            // if for some reason tr won't come out AS IT SHOULD, fall back to checking every time a new block comes out
            console.log("Waiting for receipt...")
            return new Promise((done, fail) => {
                const filter = web3.eth.filter("latest").watch(() => {
                    console.log("Still waiting for receipt...")
                    const tr = web3.eth.getTransactionReceipt(tx)
                    if (tr) {
                        console.log("Got receipt: " + JSON.stringify(tr))
                        clearTimeout(timeoutHandle)
                        filter.stopWatching()
                        done({srcBalanceBefore, dstBalanceBefore, tx, tr})
                    }
                })
                const timeoutHandle = setTimeout(() => {
                    clearTimeout(timeoutHandle)
                    filter.stopWatching()
                    console.log("Timed out waiting for transaction receipt: "+tx+", failing promise")
                    fail(new Error("Transaction timed out: " + tx))
                }, ETHEREUM_TIMEOUT_MS)
            })
        }
    }).then(({srcBalanceBefore, dstBalanceBefore, tx, tr}) => {
        const srcBalanceAfter = web3.eth.getBalance(from)
        const dstBalanceAfter = web3.eth.getBalance(to)

        const t = web3.eth.getTransaction(tx)
        if (!t) { throw new Error("Faulty transaction: " + tx) }

        const ret = {
            valueSent: srcBalanceBefore.minus(srcBalanceAfter).toNumber(),
            valueReceived: dstBalanceAfter.minus(dstBalanceBefore).toNumber(),
            gasPrice: +t.gasPrice,
            nonce: +t.nonce,
            gasUsed: +tr.cumulativeGasUsed,
            blockNumber: +tr.blockNumber,
            txHash: tx
        }

        // events that were fired during transaction execution (except for simple send)
        if (abi) {
            ret.events = getEventsFromLogs(tr.logs, abi, to)
        }

        return ret
    }).catch(e => {
        // replace the cryptic error message when solidity code throws
        throw e.message.includes("invalid JUMP") ? new Error(THROW_ERROR_MESSAGE) : e
    })
}

// optionally filter by address
function getEventsFromLogs(logs, abi, address) {
    if (!logs.length) {
        console.log("Received empty/undefined 'logs' for getEventsFromLogs")
        return []
    }

    // cryptographic (sha3) signature used to recognize event in transaction receipt -> event
    var eventsBySignature = _(abi)
        .filter(m => m.type === "event")
        .map(m => [new SolidityEvent(null, m, null).signature(), m])
        //.map(m => [web3.eth.abi.encodeEventSignature(m), m])      // web3.js 1.0
        .fromPairs()

    return _(logs).map(log => {

        // address is checked so that when contract A calls contract B that emits an event, if
        //   contract A also has same event (name + arg types), that one won't mistakenly get emitted
        if (address && address.toLowerCase() !== log.address.toLowerCase()) { return }

        const sig = log.topics[0].replace("0x", "")
        const event = eventsBySignature.get(sig)
        if (!event) { return }  // continue; this could be some other contract's event, or anonymous event
        // TODO: currently will not handle "anonymous events" (events with no signature in topics[0]), simply ignores them

        /* web3.js 1.0 (remove direct SolidityCoder/SolidityEvent refs)
        // for anonymous events, const paramValues = web3.eth.abi.decodeLog(event.inputs, log.data, log.topics)
        const paramValues = web3.eth.abi.decodeLog(event.inputs, log.data, log.topics.slice(1))
        const paramValueArray = _.range(event.inputs.length).map(i => paramValues[i])

        return [event.name, paramValueArray]
        */

        // TODO: probably should handle somehow "If arrays (including string and bytes) are used as indexed arguments, the Keccak-256 hash of it is stored as topic instead." (http://solidity.readthedocs.io/en/develop/contracts.html#events)
        // also TODO: when web3.js 1.0 is out, check how it does it
        const paramTypes = event.inputs.filter(i => !i.indexed).map(i => i.type)
        const paramBytes = log.data.replace("0x", "")   // unindexed params go into data
        const iParamBytes = log.topics.slice(1)         // indexed params go into topics
        const paramValues = SolidityCoder.decodeParams(paramTypes, paramBytes)
        console.log(`
    Event: ${event.name}
    paramTypes: ${paramTypes}
    paramBytes: ${paramBytes}
    iParamBytes: ${iParamBytes}
    paramValues: ${paramValues}`)

        const allParamValues = event.inputs.map(i => {
            if (i.indexed) {
                return SolidityCoder.decodeParam(i.type, iParamBytes.shift())
            } else {
                return paramValues.shift()
            }
        })
        return [event.name, allParamValues]

    }).filter().fromPairs().value()
}

module.exports = {ethCall, ethSend, getEvents, getEventsFromLogs}
