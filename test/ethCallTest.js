var assert = require("assert")
var {ethCall, ethSend} = require("../src/ethCall")

require("./setupTestKeys")

const web3 = require("../src/signed-web3")

describe("ethCall", () => {
    it("should return error if no function name given", function () {
        this.timeout(0)     // disable timeout
        Promise.resolve().then(() => {
            return ethCall("src", "target", "abi", null)
        }).then(() => {
            throw "shouldn't succeed"
        }).catch(e => {
            assert.equal(e.message, "Missing function name (function:string)")
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
