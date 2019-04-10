const {ethCall, ethSend, getEvents} = require("./src/ethCall")
const compileContracts = require("./src/compileContracts")
const deployContracts = require("./src/deployContracts")
const getContractAt = require("./src/getContractAt")
const web3 = require("./src/signed-web3")

const express = require('express')
const app = express()

const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

const logger = require('morgan-body')
logger(app)

// any api handler that uses (signed) sendTransaction needs to hand over the private key first
function interceptKey(req, res, next) {
    if (!req.body.source) {
        res.send({errors: ["Must specify transaction source address (source:string)"]})
    } else if (!req.body.key) {
        res.send({errors: ["Must specify private key to sign transactions with (key:string)"]})
    } else {
        const keyHex = (req.body.key.startsWith("0x") ? "" : "0x") + req.body.key
        const sourceHex = (req.body.source.startsWith("0x") ? "" : "0x") + req.body.source
        web3.streamr.setKeyForAddress(sourceHex, keyHex)
        next()
    }
}

// wrap request handlers for uniform express-related error/response handling
function responsePromise(res, handler, args) {
    return Promise.resolve().then(() => {
        return handler.apply(null, args)
    }).then(result => {
        res.send(result)
    }).catch(e => {
        res.send({errors: [e.toString()]})
    })
}
        
app.post("/call", interceptKey, function (req, res) {
    return responsePromise(res, ethCall, [
        req.body.source, req.body.target,
        req.body.abi, req.body.function, req.body.arguments,
        req.body.value, req.body.gas, req.body.gasprice
    ])
})

app.post("/send", interceptKey, function (req, res) {
    return responsePromise(res, ethSend, [req.body.source, req.body.target, req.body.value, req.body.gasprice])
})

app.post("/events", function (req, res) {
    return responsePromise(res, getEvents, [req.body.abi, req.body.address, req.body.txHash])
})

app.post("/deploy", interceptKey, function (req, res) {
    return responsePromise(res, deployContracts, [req.body.code, req.body.args, req.body.source, req.body.value, req.body.gasprice])
})

app.get("/contract", function (req, res) {
    return responsePromise(res, getContractAt, [req.query.at, req.query.network])
})

app.post("/compile", function (req, res) {
    return responsePromise(res, compileContracts, [req.body.code])
})

app.get("/", function (req, res) {
    res.send({"status": "ok"})
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    const err = new Error('Not Found')
    err.status = 404
    next(err)
})

// error handler
app.use(function (err, req, res) {
    console.error(err)
    res.status(err.status || 500).send({errors: [err]})
})

module.exports = app
