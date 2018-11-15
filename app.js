var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan-body');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var {ethCall, ethSend, getEvents} = require("./src/ethCall")
var {compileContracts, deployContracts} = require("./src/compileContracts")
var getContractAt = require("./src/getContractAt")
var web3 = require("./src/signed-web3")

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

logger(app)

var router = express.Router()
//router.use(interceptKey)

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
        
router.post("/call", interceptKey, function (req, res, next) {
    return responsePromise(res, ethCall, [
        req.body.source, req.body.target,
        req.body.abi, req.body.function, req.body.arguments,
        req.body.value, req.body.gas, req.body.gasprice
    ])
})

router.post("/send", interceptKey, function (req, res, next) {
    return responsePromise(res, ethSend, [req.body.source, req.body.target, req.body.value, req.body.gasprice])
})

router.post("/events", function (req, res, next) {
    return responsePromise(res, getEvents, [req.body.abi, req.body.address, req.body.txHash])
})

router.post("/deploy", interceptKey, function (req, res, next) {
    return responsePromise(res, deployContracts, [req.body.code, req.body.args, req.body.source, req.body.value, req.body.gasprice])
})

router.get("/contract", function (req, res, next) {
    return responsePromise(res, getContractAt, [req.query.at, req.query.network])
})

router.post("/compile", function (req, res, next) {
    return responsePromise(res, compileContracts, [req.body.code])
})


/** Status page */
router.get("/", function (req, res, next) {
    res.render("index", {web3})
});


app.use('/', router);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    console.log(err)
    res.status(err.status || 500).send({errors: [err]})
});

module.exports = app;
