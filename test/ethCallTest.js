var assert = require("assert")
var {ethCall, ethSend} = require("../src/ethCall")

var Web3 = require("web3")
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'))

describe("ethCall", () => {
    it("should return error if no function name given", function () {
        this.timeout(0)     // disable timeout
        return ethCall("src", "target", "abi", null).then(() => {
            throw "shouldn't succeed"
        }).catch(e => {
            assert.equal(e, "Missing function name!")
        })
    })

    // TODO: tests
})

describe("ethSend", () => {
    it("should return the usual stuff if successful", function () {
        this.timeout(0)     // disable timeout
        from = web3.eth.accounts[0]
        to = web3.eth.accounts[1]
        return ethSend(from, to, 1).then(result => {
            assert.equal(result.valueReceived, 1)
        })
    })
})
