var assert = require("assert")
var {ethCall, ethSend} = require("../src/ethCall")

require("./setupTestKeys")

const web3 = require("../src/signed-web3")

describe("ethCall", () => {
    it("should return error if no function name given", function () {
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
        // ropsten
        //const from = "0x9e3d69305da51f34ee29bfb52721e3a824d59e69"
        //const to = "0xddc8963569bc7f237fee4eaf129d26d276fcf22e"
        // testrpc
        const from = "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1"
        const to = "0x4178babe9e5148c6d5fd431cd72884b07ad855a0"
        return ethSend(from, to, 1).then(result => {
            assert.equal(result.valueReceived, 1)
        })
    })
})
