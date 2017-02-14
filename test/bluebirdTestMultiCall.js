var Promise = require("bluebird")

function derp(arg1, arg2, callback) {
    callback(null, arg1)
    callback(null, arg2)
    callback("error lol")
}

var pro = Promise.promisify(derp)
console.log(pro(3, "asdf").then(val => {
    console.log("Got " + val)
    return "All good!"
}).then(console.log).then(console.log).then(console.log).catch(error => {
    console.log("Error: " + error)
    return "End catching"
}))


Promise.all([]).then(console.log)

var p = new Promise((done, fail) => { setTimeout(() => { done("yolo") }, 1000) })
p.then(console.log)
Promise.all([p]).then(console.log)