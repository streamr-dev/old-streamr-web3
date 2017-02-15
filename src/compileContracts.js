var _ = require("lodash")
var Promise = require("bluebird")
var solc = require("solc")

var Web3 = require("web3")
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'))

function getAbi(code) {
    var compiled = solc.compile(code)
    var contracts = _(compiled.contracts).map((c, rawName) => {
        var name = (rawName[0] == ":") ? rawName.slice(1) : rawName
        var abi = JSON.parse(c.interface)
        var bytecode = c.bytecode
        return {name, abi, bytecode}
    }).value()
    var errors = compiled.errors || []
    return {contracts, errors}
}

function deployContracts(code, constructorParams, value, from) {
    if (!code) { throw "Code to deploy not provided!" }
    if (!constructorParams) { constructorParams = [] }
    if (!value) { value = 0 }
    if (!from) { from = web3.eth.coinbase }

    var {contracts, errors} = getAbi(code)
    var deploymentsDone = []
    _(contracts).each(c => {
        // see https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethcontract
        var Contract = web3.eth.contract(c.abi)
        var gas = web3.eth.estimateGas({data: c.bytecode.startsWith("0x") ? c.bytecode : "0x" + c.bytecode}) * 2
        var data = c.bytecode
        // TODO: check and typecast constructorParams (e.g. BigIntegers)
        var p = new Promise((done, fail) => {
            var instance = Contract.new(...constructorParams, {from, value, data, gas})
            web3.eth.filter("latest").watch((e, block) => {
                // Contract.new will assign the address directly in the instance when it gets it
                //   there is a bit of a race condition here though: internally Contract.new also watches "latest", so
                //   we of course hope it gets its turn first... which it should, since it registered first
                if (instance.address) {
                    c.address = instance.address
                    done(c)
                }
            })
        })
        deploymentsDone.push(p)
    })
    return Promise.all(deploymentsDone).then(contracts => {
        return {contracts, errors}
    })
}

module.exports = {getAbi, deployContracts}
