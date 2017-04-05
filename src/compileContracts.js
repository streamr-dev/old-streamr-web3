const _ = require("lodash")
//const Promise = require("bluebird")

const web3 = require("./signed-web3")
const solc = require("solc")
const ContractFactory = require("web3/lib/web3/contract")

const getAbi = function(code) {
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

const deployContracts = function(code, constructorParams, from, value) {
    if (!code) { throw new Error("Must provide code to deploy (code:string)") }
    if (!constructorParams) { constructorParams = [] }
    if (!from) { throw new Error("Must provide sender account (from:address)") }
    if (!value) { value = 0 }

    var {contracts, errors} = getAbi(code)
    var deploymentsDone = []
    _(contracts).each(c => {
        // see https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethcontract
        //var Contract = web3.eth.contract(c.abi)
        var Contract = new ContractFactory(web3.eth, c.abi)
        var data = c.bytecode.startsWith("0x") ? c.bytecode : "0x" + c.bytecode
        var gas = web3.eth.estimateGas({data}) * 2
        // TODO: check and typecast constructorParams (ESPECIALLY addresses, but also e.g. BigIntegers)
        var p = new Promise((done, fail) => {
            var instance = Contract.new(...constructorParams, {from, value, data, gas})
            var filter = web3.eth.filter("latest").watch((e, block) => {
                // Contract.new will assign the address directly in the instance when it gets it
                //   there is a bit of a race condition here though: internally Contract.new also watches "latest", so
                //   we of course hope it gets its turn first... which it should, since it registered first
                if (instance.address) {
                    filter.stopWatching()
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
