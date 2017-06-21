/**
 * Stress-test streamr-web3 by sending a lot of transactions
 *
 * Try to reproduce CORE-903: streamr-web3 stops getting transactions through

 After a while, streamr-web3 starts failing to get transactions through to Ethereum.

 What is known:
 Transactions don't go through to Ethereum (don't show on etherscan)
 Geth log shows submitted transactions (see log below)
 Restarting geth does not fix the problem
 Restarting streamr-web3 fixes the problem

 *
 */

const rest = require("restling");
const Promise = require('bluebird')

const streamrWeb3Server = "localhost:3001"
const reportingInterval = 1
const concurrency = 30
const initialSendIntervalMs = 50000

const source = "0xb3428050eA2448eD2E4409bE47E1a50EBac0B2d2"
const key = "6e340f41a1c6e03e6e0a4e9805d1cea342f6a299e7c931d6f3da6dd34cb6e17d"
const target = "0x60f78aa68266c87fecec6dcb27672455111bb347"
const abi = [{"constant":true,"inputs":[],"name":"logSize","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"number","type":"int256"}],"name":"addToLog","outputs":[],"payable":true,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"log","outputs":[{"name":"","type":"int256"}],"payable":false,"type":"function"},{"inputs":[{"name":"recipientAddress","type":"address"},{"name":"unitPrice_ETH","type":"uint256"}],"payable":true,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"x","type":"string"}],"name":"Print","type":"event"}]
/*
 pragma solidity ^0.4.4;
 contract Testing {
    address recipient;
    uint unitPriceWei;

    mapping(uint => int) public log;
    uint public logSize = 0;

    event Print(string x);

    function Testing(address recipientAddress, uint unitPrice_ETH) payable {
        unitPriceWei = unitPrice_ETH;
        recipient = recipientAddress;
    }

    function addToLog(int number) payable {
        log[logSize] = number;
        logSize++;
        Print("Done");
        if (msg.value > 0) {
            Print("Sending");
            recipient.transfer(msg.value);
        }
    }
}
*/

// send out `concurrency` requests that will re-start when complete and keep looping
var initialized = 0
function startHammering() {
    sendRequest()
    setTimeout(() => {
        initialized++
        if (initialized < concurrency) {
            startHammering()
        }
    }, initialSendIntervalMs)
}
startHammering()

var sent = 0
var received = 0
var failed = 0
var pending = 0
function sendRequest() {
    const url = "http://" + streamrWeb3Server + "/call"
    const body = {
        function: "addToLog",
        arguments: [Date.now()],
        source,
        key,
        target,
        abi
    }

    sent++
    pending++
    rest.postJson(url, body).then(res => {
        if (!res || !res.data) { throw new Error("Bad response") }
        if (res.data.errors) { throw new Error(JSON.stringify(res.data.errors)) }
        received++
    }).catch(e => {
        failed++
        if (failed < 10) {
            console.error(e)
        }
    }).then(() => {
        pending--
    }).then(sendRequest)

    if (sent % reportingInterval == 0) {
        console.log(`[${new Date().toTimeString().slice(0, 8)}] ${received} ok + ${failed} fail + ${pending} = ${sent} total`)
    }
}