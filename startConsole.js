var _ = require("lodash")
var Table = require("cli-table")

var Web3 = require("web3")
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'))

const repl = require('repl')
const ctx = repl.start().context

ctx.web3 = web3
ctx.lo = _
ctx.e = web3.eth

ctx.B = function (i) { return web3.eth.getBalance(web3.eth.accounts[i]).toString() }
ctx.b = function (i) { return web3.fromWei(web3.eth.getBalance(web3.eth.accounts[i]), "ether").toString() }
ctx.BB = function () { return web3.eth.accounts.map((a) => { return web3.eth.getBalance(a) }) }
ctx.bb = function () { return web3.eth.accounts.map((a) => { return web3.fromWei(web3.eth.getBalance(a), "ether") }) }

ctx.move = function (fromI, toI, eth) {
    const args = {
        from: web3.eth.accounts[fromI],
        to: web3.eth.accounts[toI],
        value: web3.toWei(eth, "ether")
    }
    return web3.eth.sendTransaction(args)
}

ctx.list = function () {
    const balances = ctx.bb()
    const n = web3.eth.accounts.length
    const rows = _.zip(_.range(n), web3.eth.accounts, balances)

    var table = new Table({
        head: ["#", "Address", "ETH"]
    })
    table.length = n
    _.assign(table, rows)

    console.log(table.toString())
}