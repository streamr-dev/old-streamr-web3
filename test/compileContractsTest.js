var assert = require("assert")
var {getAbi, deployContracts} = require("../src/compileContracts")

const web3 = require("../src/signed-web3")
require("./setupTestKeys")

var TEST_CODE = `
pragma solidity ^0.4.0;
contract Test {
    uint public meh = 2;
    function Test() payable {
    }
    function heh(address x) returns (string s) {
        return "hi there";
    }
}`

describe("getAbi", () => {
    it("should return correct ABI", () => {
        var {contracts, errors} = getAbi(TEST_CODE)
        assert.equal(contracts.length, 1)
        assert.equal(errors.length, 0)
        assert.deepEqual(contracts[0], {
            name: "Test",
            abi: [{
                constant: false,
                inputs: [{ name: "x", type: "address" }],
                name: "heh",
                outputs: [{ name: "s", type: "string" }],
                payable: false,
                type: "function"
            }, {
                constant: true,
                inputs: [],
                name: "meh",
                outputs: [{ name: "", type: "uint256" }],
                payable: false,
                type: "function"
            }, {
              inputs: [],
              payable: true,
              type: "constructor",
            }],
            bytecode: "606060405260026000555b5b5b6101b68061001b6000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806351cd1f8014610046578063d8ec55ed14610103575bfe5b341561004e57fe5b61007a600480803573ffffffffffffffffffffffffffffffffffffffff16906020019091905050610129565b60405180806020018281038252838181518152602001915080519060200190808383600083146100c9575b8051825260208311156100c9576020820191506020810190506020830392506100a5565b505050905090810190601f1680156100f55780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561010b57fe5b610113610170565b6040518082815260200191505060405180910390f35b610131610176565b604060405190810160405280600881526020017f686920746865726500000000000000000000000000000000000000000000000081525090505b919050565b60005481565b6020604051908101604052806000815250905600a165627a7a72305820ba2777844d186f1512e918bf0bfe913c9c5485614536fcff1ebe0424ebdef7cc0029"
        })
    })

    it("should give missing pragma warning", () => {
        var code = "contract Test {}"
        var {contracts, errors} = getAbi(code)
        assert.equal(contracts.length, 1)
        assert.equal(errors.length, 1)
        assert(errors[0].indexOf("pragma") > -1)
    })

    it("should give errors for malformed code", () => {
        var code = "contract Test {} lol"
        var {contracts, errors} = getAbi(code)
        assert.equal(contracts.length, 0)
        assert.equal(errors.length, 1)
        assert(errors[0].indexOf("Error: Expected import directive or contract definition") > -1)
    })

    it("should include param annotations", () => {
        var code = `
/// @dev herp derp
contract PayByUse {
    address recipient;
    uint unitPriceWei;
    
    /// @dev unitPrice_ETH ether
    function PayByUse(address recipientAddress, uint unitPrice_ETH) payable {
        unitPriceWei = unitPrice_ETH;
        recipient = recipientAddress;
    }
}`
        // TODO: doesn't work; the relevant userDoc/developerDoc doesn't show up in solc --natspec
        //   at least not on testrpc, maybe works on geth the real thing?
        var {contracts, errors} = getAbi(code)
        //assert(contracts[0].abi[0].inputs[1].conversion, "ether")
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
        this.timeout(0)     // disable timeout
        return deployContracts(TEST_CODE, [], web3.eth.coinbase, 10000).then(res => {
            var {contracts, errors} = res
            var address = contracts[0].address
            assert(address)
            assert.equal(web3.eth.getBalance(address).toNumber(), 10000)
        })
    })
})