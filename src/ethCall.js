var _ = require("lodash")

var Web3 = require("web3")
var SolidityEvent = require("web3/lib/web3/event.js")
var SolidityCoder = require("web3/lib/solidity/coder.js");
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'))

function ethCall(from, to, abi, functionName, args, value, gas) {
    if (typeof from != "string") { from = web3.eth.coinbase }
    if (typeof to != "string") { return Promise.reject("Missing target address!") }
    if (!abi) { return Promise.reject("Missing contract interface (abi)!") }
    if (!functionName) { return Promise.reject("Missing function name!") }
    if (!args) { args = [] }
    if (!value) { value = 0 }
    if (!gas) { gas = 2000000 }
    to = to.trim()

    var contract = web3.eth.contract(abi).at(to)
    var func = contract[functionName]
    if (!func) { return Promise.reject(functionName + " not found in contract!") }

    var interface = _(abi).find(m => m.type === "function" && m.name === functionName)
    if (!interface) { return Promise.reject(functionName + " not found in ABI!") }
    if (interface.constant) {
        var res = func.call(...args)
        if (!_(res).isArray()) { res = [res]; }
        return Promise.resolve({results: res})
    } else {
        return transactionPromise(from, to, abi, () => {
            return func.sendTransaction(...args, {from, value, gas})
        })
    }
}

function ethSend(from, to, value) {
    if (typeof from != "string") { from = web3.eth.coinbase }
    if (typeof to != "string") { return Promise.reject("Missing target address!") }
    if (!value) { value = 0 }

    return transactionPromise(from, to, null, () => {
        return web3.eth.sendTransaction({from, to, value})
    })
}

function transactionPromise(from, to, abi, getTransaction) {
    return new Promise((done, fail) => {
        var srcBalanceBefore = web3.eth.getBalance(from)
        var dstBalanceBefore = web3.eth.getBalance(to)
        var tx = getTransaction()

        // according to https://github.com/ethereum/wiki/wiki/JavaScript-API#contract-methods sendTransaction should be sync,
        //   and only return after transaction is complete and tr is non-null.
        // This turned out not to be the case with testnet geth, hence: only resolve promise after we definitely have the tr
        var tr = web3.eth.getTransactionReceipt(tx)
        if (tr) {
            done({srcBalanceBefore, dstBalanceBefore, tx, tr})
        } else {
            // if for some reason tr won't come out AS IT SHOULD, fall back to checking every time a new block comes out
            var filter = web3.eth.filter("latest").watch((e, block) => {
                var tr = web3.eth.getTransactionReceipt(tx)
                if (tr) {
                    filter.stopWatching()
                    done({srcBalanceBefore, dstBalanceBefore, tx, tr})
                }
            })
        }
    }).then(({srcBalanceBefore, dstBalanceBefore, tx, tr}) => {
        var srcBalanceAfter = web3.eth.getBalance(from)
        var dstBalanceAfter = web3.eth.getBalance(to)
        var t = web3.eth.getTransaction(tx)

        var ret = {
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
                var sig = log.topics[0].replace("0x", "")
                var event = eventsBySignature.get(sig)
                var types = event.inputs.map(i => i.type)
                var rawArgs = log.data.replace("0x", "")
                return [event.name, SolidityCoder.decodeParams(types, rawArgs)]
            }).fromPairs().value()
        }

        return ret
    })    
}

module.exports = {ethCall, ethSend}
