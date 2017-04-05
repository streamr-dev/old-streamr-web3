const _ = require("lodash")
const web3 = require("./signed-web3")
const Promise = require("bluebird")

const SolidityEvent = require("web3/lib/web3/event.js")
const SolidityCoder = require("web3/lib/solidity/coder.js")

const THROW_ERROR_MESSAGE = "transaction rolled back after 'throw'"

const ethCall = function(from, to, abi, functionName, args, value, gas) {
    if (typeof from != "string") { throw new Error("Must specify sender account (from:address)") }
    if (typeof to != "string") { throw new Error("Must specify target address (to:address)") }
    if (!abi) { throw new Error("Missing contract interface (abi:json)") }
    if (!functionName) { throw new Error("Missing function name (function:string)") }
    if (!args) { args = [] }
    if (!value) { value = 0 }
    if (!gas) { gas = 2000000 }
    to = to.trim()

    const contract = web3.eth.contract(abi).at(to)
    const func = contract[functionName]
    if (!func) { throw new Error(functionName + " not found in contract!") }

    const functionMetadata = _(abi).find(m => m.type === "function" && m.name === functionName)
    if (!functionMetadata) { throw new Error(functionName + " not found in ABI") }
    if (functionMetadata.constant) {
        const res = func.call(...args)
        return Promise.resolve({results: wrapArray(res)})
    } else {
        return transactionPromise(from, to, abi, () => {
            return Promise.promisify(func.sendTransaction)(...args, {from, value, gas})
        })
    }
}

// send ether, no function call
const ethSend = function(from, to, value) {
    if (typeof from != "string") { throw new Error("Must specify sender account (from:address)") }
    if (typeof to != "string") { throw new Error("Must specify target address (to:address)") }
    if (!value) { value = 0 }

    return transactionPromise(from, to, null, () => {
        return Promise.promisify(web3.eth.sendTransaction)({from, to, value})
    })
}

// fetch events from tx according to ABI
const getEvents = function(abi, address, tx) {
    const tr = web3.eth.getTransactionReceipt(tx)
    return getEventsFromLogs(tr.logs, abi, address)
}


const transactionPromise = function(from, to, abi, getTransaction) {
    const srcBalanceBefore = web3.eth.getBalance(from)
    const dstBalanceBefore = web3.eth.getBalance(to)
    return getTransaction().then(tx => {
        const t = web3.eth.getTransaction(tx)
        if (!t) { throw new Error("Faulty transaction: " + tx) }
        const tr = web3.eth.getTransactionReceipt(tx)
        if (tr) {
            console.log("Got receipt: " + JSON.stringify(tr))
            return {srcBalanceBefore, dstBalanceBefore, tx, tr, t}
        } else {
            // if for some reason tr won't come out AS IT SHOULD, fall back to checking every time a new block comes out
            console.log("Waiting for receipt...")
            return new Promise((done, fail) => {
                const filter = web3.eth.filter("latest").watch((e, block) => {
                    console.log("Still waiting for receipt...")
                    const tr = web3.eth.getTransactionReceipt(tx)
                    if (tr) {
                        console.log("Got receipt: " + JSON.stringify(tr))
                        filter.stopWatching()
                        done({srcBalanceBefore, dstBalanceBefore, tx, tr, t})
                    }
                })
            })
        }
    }).then(({srcBalanceBefore, dstBalanceBefore, tx, tr, t}) => {
        const srcBalanceAfter = web3.eth.getBalance(from)
        const dstBalanceAfter = web3.eth.getBalance(to)

        const ret = {
            valueSent: srcBalanceBefore.minus(srcBalanceAfter).toNumber(),
            valueReceived: dstBalanceAfter.minus(dstBalanceBefore).toNumber(),
            gasPrice: +t.gasPrice,
            nonce: +t.nonce,
            gasUsed: +tr.cumulativeGasUsed,
            blockNumber: +tr.blockNumber
        }

        // events that were fired during transaction execution (except for simple send)
        if (abi) {
            ret.events = getEventsFromLogs(tr.logs, abi)
        }

        return ret
    }).catch(e => {
        // replace the cryptic error message when solidity code throws
        throw e.message.includes("invalid JUMP") ? new Error(THROW_ERROR_MESSAGE) : e
    })
}

// optionally filter by address
const getEventsFromLogs = function(logs, abi, address) {
    if (!logs.length) {
        console.log("Received empty/undefined 'logs' for getEventsFromLogs")
        return []
    }

    // cryptographic (sha3) signature used to recognize event in transaction receipt -> event
    eventsBySignature = _(abi)
        .filter(m => m.type === "event")
        .map(m => [new SolidityEvent(null, m, null).signature(), m])
        //.map(m => [web3.eth.abi.encodeEventSignature(m), m])      // web3.js 1.0
        .fromPairs()

    return _(logs).map(log => {
        if (address && address !== log.address) { return }
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

const wrapArray = function(maybeArray) {
    return _(maybeArray).isArray() ? maybeArray : [maybeArray]
}

module.exports = {ethCall, ethSend, getEvents, getEventsFromLogs}
