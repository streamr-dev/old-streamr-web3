/**
 * runner.js - more like STOP running amok
 *
 * May be useful if there is a process watcher (e.g. pm2) that restarts the process if it exits
 **/

// TODO: parameters from process.env and process.argv
const enabled = true
const survivableBumpCount = 10
const bumpCooldownMs = 1000
const criticalErrors = [
    "Nonce too low"
]

function dieAfterMs(delayMs) {
    setTimeout(die, delayMs)
}

function die() {
    if (enabled) {
        process.exit(1)
    }
}

var lastBump = 0
var bumpCount = 0
function bump() {
    const now = +new Date()
    if (now - lastBump > bumpCooldownMs) {
        bumpCount = 0
    }
    bumpCount++
    if (bumpCount > survivableBumpCount) {
        dieAfterMs(1)
    }
}

function dieIfCriticalError(e) {
    const errorMessage = e.message ? e.message : e.toString()
    criticalErrors.forEach(err => {
        if (errorMessage.contains(err)) {
            dieAfterMs(1)
        }
    })
}

module.exports = { die, dieAfterMs, bump, dieIfCriticalError }