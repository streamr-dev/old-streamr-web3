const _ = require("lodash")
const web3 = require("./signed-web3")
const Promise = require("bluebird")

const SolidityEvent = require("web3/lib/web3/event.js")
const SolidityCoder = require("web3/lib/solidity/coder.js")

const THROW_ERROR_MESSAGE = "transaction rolled back after 'throw'"

function ethCall(from, to, abi, functionName, args, value, gas) {
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
function ethSend(from, to, value) {
    if (typeof from != "string") { throw new Error("Must specify sender account (from:address)") }
    if (typeof to != "string") { throw new Error("Must specify target address (to:address)") }
    if (!value) { value = 0 }

    return transactionPromise(from, to, null, () => {
        return Promise.promisify(web3.eth.sendTransaction)({from, to, value})
    })
}

function transactionPromise(from, to, abi, getTransaction) {
    return new Promise((done, fail) => {
        const srcBalanceBefore = web3.eth.getBalance(from)
        const dstBalanceBefore = web3.eth.getBalance(to)
        return getTransaction()
    }).then(tx => {
        const tr = web3.eth.getTransactionReceipt(tx)
        if (tr) {
            done({srcBalanceBefore, dstBalanceBefore, tx, tr})
        } else {
            // if for some reason tr won't come out AS IT SHOULD, fall back to checking every time a new block comes out
            const filter = web3.eth.filter("latest").watch((e, block) => {
                const tr = web3.eth.getTransactionReceipt(tx)
                if (tr) {
                    filter.stopWatching()
                    done({srcBalanceBefore, dstBalanceBefore, tx, tr})
                }
            })
        }
    }).then(({srcBalanceBefore, dstBalanceBefore, tx, tr}) => {
        const srcBalanceAfter = web3.eth.getBalance(from)
        const dstBalanceAfter = web3.eth.getBalance(to)
        const t = web3.eth.getTransaction(tx)

        const ret = {
            valueSent: srcBalanceBefore.minus(srcBalanceAfter).toNumber(),
            valueReceived: dstBalanceAfter.minus(dstBalanceBefore).toNumber(),
            gasPrice: +t.gasPrice,
            nonce: +t.nonce,
            gasUsed: +tr.cumulativeGasUsed,
            blockNumber: +tr.blockNumber
        }        
        
        // cryptographic (sha3) signature used to recognize event in transaction receipt -> event 
        if (abi) {
            eventsBySignature = _(abi)
                .filter(m => m.type === "event")
                .map(m => [new SolidityEvent(null, m, null).signature(), m])
                .fromPairs()

            // events that were fired during transaction execution
            ret.events = _(tr.logs).map(log => {
                const sig = log.topics[0].replace("0x", "")
                const event = eventsBySignature.get(sig)
                const types = event.inputs.map(i => i.type)
                const rawArgs = log.data.replace("0x", "")
                return [event.name, SolidityCoder.decodeParams(types, rawArgs)]
            }).fromPairs().value()
        }

        return ret
    }).catch(e => {
        // replace the cryptic error message when solidity code throws
        throw e.message.includes("invalid JUMP") ? new Error(THROW_ERROR_MESSAGE) : e
    })
}

function wrapArray(maybeArray) {
    return _(maybeArray).isArray() ? maybeArray : [maybeArray]
}

module.exports = {ethCall, ethSend}
