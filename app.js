var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan-body');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var ethCall = require("./src/ethCall")
var {getAbi, deployContracts} = require("./src/compileContracts")

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
logger(app)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var router = express.Router()




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




var Web3 = require("web3")
var web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'))

/** Status page */
router.get("/", function (req, res, next) {
  res.render("index", {web3})
});

router.get("/profile", function (req, res, next) {
  res.send({
    address: web3.eth.coinbase
  })
})





app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(err)
  res.status(err.status || 500).send({error: err})
});

module.exports = app;
