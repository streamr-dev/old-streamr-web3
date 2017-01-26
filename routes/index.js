var _ = require("lodash")
var express = require("express")

var Web3 = require("web3")
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'))


var router = express.Router()
const bodyParser = require('body-parser')
//router.use(bodyParser.json())

/** Status page */
router.get("/", function (req, res, next) {
    res.render("index", {web3})
});

/** eth_call to a constant function (doesn't alter blockchain state) */
router.post("/call", bodyParser.text(), function (req, res, next) {
    var result = "ERROR"
    try {
        var req_body = JSON.parse(req.body)     // bodyParser.json() failed to parse for some reason
        result = ethCall(req_body.target, req_body.abi, req_body.function, req_body.arguments)
    } catch (e) {
        result = "ERROR: " + e
    }
    res.send({result})
})

function ethCall(targetAddress, abi, functionName, args) {
    if (typeof targetAddress != "string") { throw "Missing target address!" }
    if (!abi) { throw "Missing contract interface (abi)!" }
    if (!functionName) { throw "Missing function name!" }
    if (!args) { args = [] }

    // check interface is valid for eth_call
    var interface = _(abi).find(m => m.type === "function" && m.name === functionName)
    if (!interface) { throw functionName + " not found in ABI!" }
    if (!interface.constant) { throw functionName + " not marked as 'constant', send transaction instead of calling!" }

    var contract = web3.eth.contract(abi).at(targetAddress.trim())
    var func = contract[functionName]
    if (!func) { throw functionName + " not found in contract!" }

    return func.call(...args)
}

/** eth_sendTransaction */
router.post("/send", bodyParser.text(), function (req, res, next) {
    var result = "ERROR"
    try {
        var req_body = JSON.parse(req.body)     // bodyParser.json() failed to parse for some reason
        result = ethCall(req_body.target, req_body.abi, req_body.function, req_body.arguments)
    } catch (e) {
        result = "ERROR: " + e
    }
    res.send({result})
})

function ethSend(from, to, abi, functionName, args, value) {
    if (typeof from != "string") { throw "Missing source address!" }
    if (typeof to != "string") { throw "Missing target address!" }
    if (!abi) { throw "Missing contract interface (abi)!" }
    if (!functionName) { throw "Missing function name!" }
    if (!args) { args = [] }
    if (!value) { value = 0 }

    // check interface is valid for eth_call
    var interface = _(abi).find(m => m.type === "function" && m.name === functionName)
    if (!interface) { throw functionName + " not found in ABI!" }
    if (interface.constant) { throw functionName + " is marked as 'constant', call instead of sending transaction!" }

    var contract = web3.eth.contract(abi).at(targetAddress.trim())
    var func = contract[functionName]
    if (!func) { throw functionName + " not found in contract!" }

    return func(...args, {from, to, value})
}

module.exports = router
