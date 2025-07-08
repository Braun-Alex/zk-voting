/* eslint-disable no-restricted-globals */
import * as aleo from "@provablehq/sdk";

await aleo.initThreadPool();
const ALEO_NODE_REST_API = process.env.REACT_APP_ALEO_NODE_REST_API;
const keyProvider = new aleo.AleoKeyProvider();
keyProvider.useCache = true;

self.postMessage({
    type: "ALEO_WORKER_READY",
});

self.addEventListener("message", (ev) => {
    const networkClient = new aleo.AleoNetworkClient(ALEO_NODE_REST_API);
    const aleoAccount = new aleo.Account( { privateKey: ev.data.privateKey } );
    const recordProvider = new aleo.NetworkRecordProvider(aleoAccount, ALEO_NODE_REST_API);
    const programManager = new aleo.ProgramManager(ALEO_NODE_REST_API, keyProvider, recordProvider);

    programManager.setAccount(aleoAccount);

    if (ev.data.type === "ALEO_EXECUTE_PROGRAM_OFF_CHAIN") {
        const { program, functionName, inputs } = ev.data;

        (async function () {
            try {
                await programManager.run(
                    program,
                    functionName,
                    inputs
                ).then((executionResponse) => {
                    const outputs = executionResponse.getOutputs();
                    self.postMessage({
                        type: "OFF_CHAIN_EXECUTION_COMPLETED",
                        outputs
                    });
                }).catch((error) => {
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error
                    });
                });
            } catch (error) {
                self.postMessage({
                    type: "ERROR",
                    errorMessage: error.message
                });
            }
        })();
    }

    if (ev.data.type === "ALEO_EXECUTE_PROGRAM_ON_CHAIN") {
        const { programName, functionName, publicFee, inputs } = ev.data;

        (async function () {
            try {
                networkClient.getLatestHeight().then((height) => {
                    console.log(height);
                }).catch((error) => {
                    console.log(error.message);
                });
                programManager.buildExecutionTransaction({
                    programName: programName,
                    functionName: functionName,
                    fee: publicFee,
                    privateFee: false,
                    inputs: inputs,
                    privateKey: ev.data.privateKey
                }).then((transaction) => {
                    console.log(transaction);
                    programManager.networkClient.submitTransaction(transaction).then((tx_id) => {
                        console.log(tx_id);
                        self.postMessage({
                            type: "ON_CHAIN_EXECUTION_COMPLETED",
                            tx_id
                        });
                    }).catch((error) => {
                        self.postMessage({
                            type: "ERROR",
                            errorMessage: error
                        });
                    });
                }).catch((error) => {
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error
                    });
                });
            } catch (error) {
                self.postMessage({
                    type: "ERROR",
                    errorMessage: error.message
                });
            }
        })();
    }
});
