const _ = require("lodash")
//const Promise = require("bluebird")

const solc = require("solc")

module.exports = function compileContracts(code) {
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
