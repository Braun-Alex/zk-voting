/* eslint-disable no-restricted-globals */
import * as aleo from "@aleohq/sdk";

await aleo.initThreadPool();
const ALEO_NODE_REST_API = "http://localhost:3033";
const keyProvider = new aleo.AleoKeyProvider();

self.postMessage({
    type: "ALEO_WORKER_READY",
});

self.addEventListener("message", (ev) => {
    const aleoAccount = new aleo.Account( { privateKey: ev.data.privateKey } );
    const recordProvider = new aleo.NetworkRecordProvider(aleoAccount, ALEO_NODE_REST_API);
    const programManager = new aleo.ProgramManager(
        ALEO_NODE_REST_API,
        keyProvider,
        recordProvider,
    );
    programManager.setAccount(aleoAccount);

    keyProvider.useCache(true);

    if (ev.data.type === "ALEO_EXECUTE_PROGRAM_OFF_CHAIN") {
        const { program, functionName, inputs } = ev.data;

        (async function () {
            try {
                await programManager.run(
                    program,
                    functionName,
                    inputs,
                    false
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
                programManager.execute(
                    programName,
                    functionName,
                    publicFee,
                    false,
                    inputs,
                    undefined
                ).then((tx_id) => {
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
            } catch (error) {
                self.postMessage({
                    type: "ERROR",
                    errorMessage: error.message
                });
            }
        })();
    }
});