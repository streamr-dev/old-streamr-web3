var _ = require("lodash")

var Web3 = require("web3")
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'))

var filter = web3.eth.filter("latest")
filter.watch(function (error, blockHash) {
    const block = web3.eth.getBlock(blockHash)
    console.log("Block #" + block.number)
    _(block.transactions).each(txHash => {
        const tx = web3.eth.getTransaction(txHash)
        const tr = web3.eth.getTransactionReceipt(txHash)
        console.log(`${tr.transactionIndex}: ${tx.from} -> ${tx.to} (${tx.value.toNumber()} wei, ${tr.cumulativeGasUsed} gas, ${tr.logs.length} events)`)
        if (tr.contractAddress) {
            console.log("   Contract created at " + tr.contractAddress)
        }
    })
})
