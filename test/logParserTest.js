const assert = require("assert")
const {getEventsFromLogs} = require("../src/ethCall")

describe("ethCall.getEventsFromLogs", () => {

    const abi = [{
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "num",
                "type": "uint"
            },
            /*{
             "indexed": false,
             "name": "arr",
             "type": "uint[]"
             },*/
        ],
        "name": "Derp",
        "type": "event"
    }]

    const logs = [{
        "address": "0xae23da949f70d63cd74c96df6183f1b93f451daa",
        "topics": [
            "0x73a2d8839800a612ac82512f3c0a544f1d0f9e045f6f179a239d2250a0c58cc2"
        ],
        "data": "0x0000000000000000000000000000000000000000000000000000000000000123",
        "blockNumber": 819329,
        "transactionIndex": 1,
        "transactionHash": "0x7eb73b03941238c6c122cf7d1601352432ffa68219db6ed8eda653ab18150f60",
        "blockHash": "0xb9fc9ce7e8c1b669bb2045f97f305827b2a12cc73f2e766a8c9a1de91e32df23",
        "logIndex": 1,
        "removed": false
    }]

    it("should correctly return uint parameter value (no address given)", () => {
        const values = getEventsFromLogs(logs, abi).Derp
        assert.equal(values.length, 1)
        assert.equal(+values[0], 0x123)
    })

    it("should correctly return uint parameter value (correct address given)", () => {
        const values = getEventsFromLogs(logs, abi, "0xae23da949f70d63cd74c96df6183f1b93f451daa").Derp
        assert.equal(values.length, 1)
        assert.equal(+values[0], 0x123)
    })

    it("should correctly return uint parameter value (wrong address given)", () => {
        const values = getEventsFromLogs(logs, abi, "arrrrrrrr").Derp
        assert.equal(values, undefined)
    })

    const newParcelEventAbi = [{
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "Creator",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "ParcelAddress",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "Owner",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "Name",
                "type": "string"
            }
        ],
        "name": "NewParcel",
        "type": "event"
    }]

    const newParcelEventLogs = [{
        "address": "0xae23da949f70d63cd74c96df6183f1b93f451daa",
        "topics": [
            "0xbb4527500ef6472832569523e42a80d78a01d24c8887b0c03305f67fad4b4163",
            "0x000000000000000000000000b3428050ea2448ed2e4409be47e1a50ebac0b2d2",
            "0x000000000000000000000000b155d4c95f61803d12f69e3bb1de1f419a8a61ba",
            "0x000000000000000000000000b3428050ea2448ed2e4409be47e1a50ebac0b2d2"
        ],
        "data": "0x0000000000000000000000000000000000000000000000000000000000000020" +
        "0000000000000000000000000000000000000000000000000000000000000006" +
        "50617263656c0000000000000000000000000000000000000000000000000000", // "Parcel"
        "blockNumber": 819329,
        "transactionIndex": 1,
        "transactionHash": "0x7eb73b03941238c6c122cf7d1601352432ffa68219db6ed8eda653ab18150f60",
        "blockHash": "0xb9fc9ce7e8c1b669bb2045f97f305827b2a12cc73f2e766a8c9a1de91e32df23",
        "logIndex": 1,
        "removed": false
    }]

    it("should correctly return parameter values (no address given)", () => {
        const values = getEventsFromLogs(newParcelEventLogs, newParcelEventAbi).NewParcel
        assert.deepEqual(values, [
            "0x00b3428050ea2448ed2e4409be47e1a50ebac0b2",
            "0x00b155d4c95f61803d12f69e3bb1de1f419a8a61",
            "0x00b3428050ea2448ed2e4409be47e1a50ebac0b2",
            "Parcel"]
        )
    })
})
