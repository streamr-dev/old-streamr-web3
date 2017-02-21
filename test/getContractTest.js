var assert = require("assert")
var getContractAt = require("../src/getContractAt")

describe("getContractAt", () => {
    it("should return address that was given, if successful", () => {
        var address = "0x4936a2b35f3798b0ce76d4b5e137d9c33061ed9c"
        return getContractAt(address).then(result => {
            assert.equal(result.address, address)
        })
    })

    it("should return ABI for a known contract", () => {
        // see https://testnet.etherscan.io/address/0x7d86a87178d28f805716828837d1677fb7af6ff7#code
        var address = "0x7d86a87178d28f805716828837d1677fb7af6ff7"
        return getContractAt(address).then(result => {
            assert.deepEqual(result, {
                address,
                abi: [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_owner","type":"address"}],"name":"setOwner","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"nextTimestamp","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"giveMe","outputs":[{"name":"success","type":"bool"}],"payable":true,"type":"function"},{"constant":false,"inputs":[{"name":"who","type":"address"}],"name":"giveTo","outputs":[{"name":"success","type":"bool"}],"payable":true,"type":"function"},{"constant":true,"inputs":[],"name":"delay","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"who","type":"address"}],"name":"giveForce","outputs":[{"name":"success","type":"bool"}],"payable":true,"type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_giveAway","type":"uint256"}],"name":"setGiveAway","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"giveAway","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"inputs":[{"name":"_giveAway","type":"uint256"},{"name":"_delay","type":"uint256"}],"payable":true,"type":"constructor"},{"payable":true,"type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"giveAway","type":"uint256"}],"name":"OnGiveAwayChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"},{"indexed":true,"name":"giveAway","type":"uint256"}],"name":"OnPaid","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"}],"name":"OnOwnerChanged","type":"event"}]
            })
        })
    })
})
