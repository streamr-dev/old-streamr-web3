var assert = require("assert")
var compileContracts = require("../src/compileContracts")
var deployContracts = require("../src/deployContracts")

const web3 = require("../src/signed-web3")
require("./setupTestKeys")

var TEST_CODE = `
pragma solidity ^0.4.0;
contract Test {
    uint public meh = 2;
    constructor() public payable {
    }
    function heh(address x) public returns (string s) {
        x.transfer(1);
        return "hi there";
    }
}`

describe("compileContracts", () => {
    it("should return correct ABI", function () {
        this.retries(10)
        var {contracts, errors} = compileContracts(TEST_CODE)
        assert.equal(contracts.length, 1)
        assert.equal(errors.length, 0)
        assert.deepEqual(contracts[0].abi, [{
            constant: false,
            inputs: [{ name: "x", type: "address" }],
            name: "heh",
            outputs: [{ name: "s", type: "string" }],
            payable: false,
            stateMutability: "nonpayable",
            type: "function"
        }, {
            constant: true,
            inputs: [],
            name: "meh",
            outputs: [{ name: "", type: "uint256" }],
            payable: false,
            stateMutability: "view",
            type: "function"
        }, {
            inputs: [],
            payable: true,
            stateMutability: "payable",
            type: "constructor",
        }])
    })

    it("should give missing pragma warning", () => {
        var code = "contract Test {}"
        var {contracts, errors} = compileContracts(code)
        assert.equal(contracts.length, 1)
        assert.equal(errors.length, 1)
        assert(errors[0].indexOf("pragma") > -1)
    })

    it("should give errors for malformed code", () => {
        var code = "contract Test {} lol"
        var {contracts, errors} = compileContracts(code)
        assert.equal(contracts.length, 0)
        assert.equal(errors.length, 1)
        assert(errors[0].indexOf("ParserError") > -1)
    })
})

describe("deployContracts", function () {
    it("should get an address", function () {
        this.timeout(0)     // disable timeout
        return deployContracts(TEST_CODE, [], web3.eth.coinbase).then(res => {
            var {contracts, errors} = res
            assert.equal(contracts.length, 1)
            assert.equal(errors.length, 0)
            assert(contracts[0].address)
        })
    })

    it("should error if code is missing", function () {
        // funny promise wrapping because deployContracts throws instead of returning Promise.reject
        return Promise.resolve().then(() => {
            return deployContracts()
        }).then(resp => {
            throw new Error("should not succeed!")
        }).catch(e => {
            assert.equal(e.message, "Must provide code to deploy (code:string)")
        })
    })

    it("should return compile errors with erroneous code", function () {
        return deployContracts("bogus", [], web3.eth.coinbase).then(resp => {
            assert(resp.contracts.length == 0)
            assert(resp.errors.length > 0)
        })
    })

    it("should send initial ETH to contract", function () {
        this.timeout(9000)
        this.retries(10)
        return deployContracts(TEST_CODE, [], web3.eth.coinbase, 10000).then(res => {
            var {contracts, errors} = res
            var address = contracts[0].address
            assert(address)
            assert.equal(web3.eth.getBalance(address).toNumber(), 10000)
        })
    })
})