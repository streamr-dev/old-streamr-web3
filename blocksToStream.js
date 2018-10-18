var _ = require("lodash")
var restler = require("restler")

// TODO: get also from argv
const serverUrl = process.env.ETHEREUM_SERVER_URL || "http://localhost:8545"
const streamrServerUrl = process.env.STREAMR_SERVER_URL || "https://eth.streamr.com"
const streamId = process.env.STREAM_ID
const streamKey = process.env.STREAM_KEY

if (!streamId || !streamKey) {
    throw new Error("STREAM_ID and STREAM_KEY environment variables required")
}

const STREAMR_HTTP_API_URL = `${streamrServerUrl}/api/v1/streams/${streamId}/data`

const trace = require("./src/transactionTrace")

var Web3 = require("web3")
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider(serverUrl))
var Iban = require("web3/lib/web3/iban")

var filter = web3.eth.filter("latest")
filter.watch(function (error, blockHash) {
    if (!blockHash) {
        console.log(error)
        return
    }
    const block = web3.eth.getBlock(blockHash)
    process.stdout.write(`\nBlock #${block.number}: `)
    _(block.transactions).each(txHash => {
        const tx = web3.eth.getTransaction(txHash)
        const tr = web3.eth.getTransactionReceipt(txHash)
        const msg = {
            blockNumber: +block.number,
            txHash: txHash,
            etherSent: +web3.fromWei(tx.value, "ether"),
            gasUsed: tr.cumulativeGasUsed,
            eventCount: tr.logs.length,
            internal: false
        }
        if (tr.contractAddress) {
            msg.contractCreated = tr.contractAddress
        }
        try {
            msg.senderBalance = web3.fromWei(web3.eth.getBalance(tx.from), "ether")
            msg.senderAddress = tx.from
        } catch (e) {
            console.log(`Bad sender: ${tx.from}: ${e.toString()}`)
        }
        try {
            msg.recipientBalance = web3.fromWei(web3.eth.getBalance(tx.to), "ether")
            msg.recipientAddress = tx.to
        } catch (e) {
            console.log(`Bad recipient ${tx.to}: ${e.toString()}`)
        }
        
        send(msg)

        const transfers = trace.getInternalTransfers(web3.currentProvider, txHash, tx.to)
        _(transfers).each(tf => {
            const internalMsg = {
                blockNumber: msg.number,
                txHash: msg.txHash,
                etherSent: tf.etherSent,
                gasUsed: tf.gasUsed,
                internal: true
                // TODO: count events?
            }
            // TODO: report created contracts?
            try {
                internalMsg.senderBalance = web3.fromWei(web3.eth.getBalance(tf.senderAddress), "ether")
                internalMsg.senderAddress = tf.senderAddress
            } catch (e) {
                console.log(`Bad sender: ${tf.senderAddress}: ${e.toString()}`)
            }
            try {
                internalMsg.recipientBalance = web3.fromWei(web3.eth.getBalance(tf.recipientAddress), "ether")
                internalMsg.recipientAddress = tf.recipientAddress
            } catch (e) {
                console.log(`Bad recipient ${tf.recipientAddress}: ${e.toString()}`)
            }

            send(internalMsg)
        })
    })
    process.stdout.write(block.transactions.length + " transaction(s) sent")
})

function send(msg) {
    var data = JSON.stringify(msg)
    var headers = { Authorization: 'token ' + streamKey }
    restler.post(STREAMR_HTTP_API_URL, { data, headers }).on("complete", (result, response) => {
        if (!response || response.statusCode != 204 && response.statusCode != 200) {
            console.log(result)     // error probably
        } else {
            process.stdout.write("<")
        }
    })
    process.stdout.write(">")
}
