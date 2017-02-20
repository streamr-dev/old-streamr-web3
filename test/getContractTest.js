var assert = require("assert")
var getContractAt = require("../src/getContractAt")

describe("getContractAt", () => {
    it("should return address that was given, if successful", () => {
        var address = "0x4936a2b35f3798b0ce76d4b5e137d9c33061ed9c"
        return getContractAt(address).then(result => {
            assert.equal(result.address, address)
        })
    })
})
