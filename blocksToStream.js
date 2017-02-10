var _ = require("lodash")
var restler = require("restler");

var ETHEREUM_CLIENT_URL = "http://localhost:8545"
//var STREAMR_HTTP_API_URL = "http://dev-data.streamr/json"
var STREAMR_HTTP_API_URL = "http://localhost:8080/json"

var Web3 = require("web3")
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider(ETHEREUM_CLIENT_URL))

var filter = web3.eth.filter("latest")
filter.watch(function (error, blockHash) {
    const block = web3.eth.getBlock(blockHash)
    process.stdout.write("Block #" + block.number)
    _(block.transactions).each(txHash => {
        const tx = web3.eth.getTransaction(txHash)
        const tr = web3.eth.getTransactionReceipt(txHash)
        const msg = {
            senderAddress: tx.from,
            recipientAddress: tx.to,
            etherSent: +web3.fromWei(tx.value, "ether"),
            senderBalance: tx.from ? +web3.fromWei(web3.eth.getBalance(tx.from), "ether") : 0,
            recipientBalance: tx.to ? +web3.fromWei(web3.eth.getBalance(tx.to), "ether") : 0,
            gasUsed: tr.cumulativeGasUsed,
            eventCount: tr.logs.length
        }
        if (tr.contractAddress) {
            msg.contractCreated = tr.contractAddress
        }
        var data = JSON.stringify(msg)
        var headers = {
            Stream: "tYbq7AIhT0ePKNv1ozPsxQ",
            Auth: "gZHlcFf-R3mqTzOgN16SXA",
            Timestamp: Date.now()
        }
        restler.post(STREAMR_HTTP_API_URL, {headers, data}).on("complete", (result, response) => {
            if (response.statusCode != 204 && response.statusCode != 200) {
                console.log(result)     // error probably
            }
        })
        process.stdout.write(":")
    })
    console.log(" " + block.transactions.length + " transaction(s) sent")
})
