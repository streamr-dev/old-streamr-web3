const _ = require("lodash")

/** get internal transactions: CALL transfers
 * @see https://github.com/Arachnid/etherquery/blob/master/etherquery/trace.go#L106
 * TODO: CREATE, CALLCODE, DELEGATECALL, SUICIDE
 */
const getInternalTransfers = function(provider, txHash, txTo) {
    const trace = provider.send({
        method: "debug_traceTransaction",
        params: [txHash, {}],
        jsonrpc: "2.0",
        id: "2"
    }).result
    if (!trace) {
        console.error("Trace not received from RPC server, please start geth with --rpcapi \"eth,net,web3,debug\" and without --fast")
        return []
    }
    const stack = [{address: txTo}]
    const transfers = []
    _(trace.structLogs).forEach(step => {
        if (step.error) {
            stack.pop()
            return  // continue
        }

        // just returned
        if (step.depth === stack.length - 1) {
            // fix up CREATE dummy address
        }

        switch (step.op) {
            case "CALL": {
                const etherSent = parseInt(step.stack[step.stack.length - 3], 16)
                const recipientAddress = "0x" + step.stack[step.stack.length - 2].slice(-40)
                if (etherSent > 0) {
                    transfers.push({
                        etherSent,
                        recipientAddress,
                        senderAddress: stack[stack.length - 1].address,
                        gasUsed: step.gasCost
                        //eventCount:  TODO: count sent events?
                    })
                }
                stack.push({address: recipientAddress})
                break
            }
            case "CREATE": {
                // TODO: report transfer
                const etherSent = parseInt(step.stack[step.stack.length - 1], 16)
                stack.push({address: "unknown"})
                break
            }
            case "CALLCODE":
            case "DELEGATECALL":
                stack.push({address: step.stack[step.stack.length - 1]})
                break
            case "SUICIDE":
                // TODO: report transfer
                break
        }
    })
    return transfers
}

module.exports = {getInternalTransfers}
