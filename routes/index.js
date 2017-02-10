var express = require("express")

var router = express.Router()
const bodyParser = require('body-parser')
//router.use(bodyParser.json())

var ethCall = require("../src/ethCall")
var {getAbi, deployContracts} = require("../src/compileContracts")

/** Status page */
router.get("/", function (req, res, next) {
    res.render("index", {web3})
});

router.post("/call", bodyParser.text(), function (req, res, next) {
    var result = { error: "Unknown error" }
    try {
        var req_body = JSON.parse(req.body)     // bodyParser.json() failed to parse for some reason
        result = ethCall(req_body.source, req_body.target,
            req_body.abi, req_body.function, req_body.arguments,
            req_body.value)
    } catch (e) {
        result = {error: e.toString()}
    }
    res.send(result)
})

router.post("/compile", bodyParser.text(), function (req, res, next) {
    var result = { error: "Unknown error" }
    try {         
        result = getAbi(req.body)
    } catch (e) {
        result = {error: e.toString()}
    }
    res.send(result)
})

router.post("/deploy", bodyParser.text(), function (req, res, next) {
    var req_body = JSON.parse(req.body)     // bodyParser.json() failed to parse for some reason
    return deployContracts(req_body.code, req_body.args, req_body.value, req_body.from).then(result => {
        res.send(result)
    }).catch(e => {
        res.send({error: e.toString()})
    })
})

module.exports = router
