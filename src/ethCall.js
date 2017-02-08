var _ = require("lodash")

var Web3 = require("web3")
var SolidityEvent = require("web3/lib/web3/event.js")
var SolidityCoder = require("web3/lib/solidity/coder.js");
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'))

function ethCall(from, to, abi, functionName, args, value, gas) {
    if (typeof from != "string") { from = web3.eth.coinbase }
    if (typeof to != "string") { throw "Missing target address!" }
    if (!abi) { throw "Missing contract interface (abi)!" }
    if (!functionName) { throw "Missing function name!" }
    if (!args) { args = [] }
    if (!value) { value = 0 }
    if (!gas) { gas = 2000000 }
    to = to.trim()

    var contract = web3.eth.contract(abi).at(to)
    var func = contract[functionName]
    if (!func) { throw functionName + " not found in contract!" }

    var interface = _(abi).find(m => m.type === "function" && m.name === functionName)
    if (!interface) { throw functionName + " not found in ABI!" }
    if (interface.constant) {
        var res = func(...args)
        if (!_(res).isArray()) { res = [res]; }
        return {results: res}
    } else {
        var srcBalanceBefore = web3.eth.getBalance(from)
        var dstBalanceBefore = web3.eth.getBalance(to)
        var tx = func(...args, {from, to, value, gas})
        var srcBalanceAfter = web3.eth.getBalance(from)
        var dstBalanceAfter = web3.eth.getBalance(to)
        var t = web3.eth.getTransaction(tx)
        var tr = web3.eth.getTransactionReceipt(tx)

        // cryptographic (sha3) signature used to recognize event in transaction receipt -> event
        eventsBySignature = _(abi)
            .filter(m => m.type === "event")
            .map(m => [new SolidityEvent(null, m, null).signature(), m])
            .fromPairs()

        events = {}
        _(tr.logs).each(log => {
            var sig = log.topics[0].replace("0x", "")
            var event = eventsBySignature.get(sig)
            var types = event.inputs.map(i => i.type);
            var rawArgs = log.data.replace("0x", "");
            events[event.name] = SolidityCoder.decodeParams(types, rawArgs);
        })

        return {
            valueSent: srcBalanceBefore - srcBalanceAfter,
            valueReceived: dstBalanceAfter - dstBalanceBefore,
            gasUsed: +tr.cumulativeGasUsed,
            gasPrice: +t.gasPrice,
            blockNumber: +tr.blockNumber,
            nonce: +t.nonce,
            events
        }
    }
}

module.exports = ethCall