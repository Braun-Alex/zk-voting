import React, { Component } from 'react';
import { Account, AleoNetworkClient, RecordCiphertext } from '@provablehq/sdk';
import pollImage from '../img/voting.jpg';
import { AuthContext } from '../Contexts/AuthContext';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

const ID_HASHING_PROGRAM = "program id_hashing.aleo;\n" +
    "\n" +
    "struct PollInfo:\n" +
    "    title as [u8; 32u32];\n" +
    "    question as [u8; 32u32];\n" +
    "    proposals as [[u8; 32u32]; 32u32];\n" +
    "    proposal_count as u8;\n" +
    "    proposer as address;\n" +
    "    duration as u32;\n" +
    "\n" +
    "\n" +
    "function to_poll_id:\n" +
    "    input r0 as PollInfo.public;\n" +
    "    hash.psd8 r0 into r1 as field;\n" +
    "    output r1 as field.private;\n" +
    "\n" +
    "\n" +
    "function to_voting_slot:\n" +
    "    input r0 as field.public;\n" +
    "    input r1 as u8.public;\n" +
    "    cast r1 into r2 as field;\n" +
    "    add r0 r2 into r3;\n" +
    "    hash.psd8 r3 into r4 as field;\n" +
    "    output r4 as field.private;";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class PollTableItem extends Component {
    static contextType = AuthContext;

    constructor(props) {
        super(props);

        this.handleVoting = this.handleVoting.bind(this);
    }

    handleVoting = async () => {
        const { poll } = this.props;
        const { ALEO_NODE_REST_API, account, worker, getAccountData, postMessagePromise } = this.context;
        await Swal.fire({
            title: 'Vote privately for your proposal',
            text: 'Enter the exact name of the proposal you want to vote for privately',
            input: 'text',
            inputPlaceholder: 'Enter your proposal',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off',
                showPasswordIcon: true
            },
            showCancelButton: true,
            confirmButtonText: 'Vote',
            showLoaderOnConfirm: true,
            cancelButtonText: 'Cancel',
            preConfirm: async (proposal) => {
                if (!poll.proposals.includes(proposal)) {
                    Swal.showValidationMessage("Poll does not contain such proposal!");
                    return false;
                }
                return poll.proposals.indexOf(proposal).toString() + "u8";
            },
            allowOutsideClick: false,
        }).then(async (result) => {
            if (result.isDismissed) {
                await Swal.fire({
                    title: 'Are you sure you want to cancel voting?',
                    text: 'Cancelling the voting returns you to page with all polls',
                    icon: 'question',
                    showConfirmButton: true,
                    confirmButtonText: 'No, I want to vote',
                    showCancelButton: true,
                    cancelButtonText: 'Yes, I want to cancel'
                }).then(async (finalResult) => {
                    if (finalResult.isConfirmed) {
                        return await this.handleVoting();
                    } else if (finalResult.isDismissed) {
                        await Swal.fire({
                            title: 'Voting has been cancelled!',
                            icon: 'info',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true
                        });
                    }
                });
            } else if (result.isConfirmed && result.value) {
                try {
                    let privateKey;
                    if (account.privateKey === '<encrypted>') {
                        const response = await getAccountData(true);
                        if (!response) {
                            return;
                        }
                        privateKey = response.privateKey;
                    } else {
                        privateKey = account.privateKey;
                    }

                    const proposalIndex = result.value;

                    const aleoAccount = new Account( { privateKey: privateKey } );
                    const aleoAddress = aleoAccount.address().to_string();

                    const ZK_VOTING_PROGRAM_NAME = "zk_voting.aleo";
                    const TICKET_FUNCTION_NAME = "create_ticket";
                    const VOTING_FUNCTION_NAME = "vote";
                    const PUBLIC_FEE = 300000;

                    const networkClient = new AleoNetworkClient(ALEO_NODE_REST_API);

                    Swal.fire({
                        title: 'Voting...',
                        html: 'Please wait while your vote is being privately casted on the Aleo network...',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    await postMessagePromise(worker, {
                        type: "ALEO_EXECUTE_PROGRAM_ON_CHAIN",
                        programName: ZK_VOTING_PROGRAM_NAME,
                        functionName: TICKET_FUNCTION_NAME,
                        publicFee: PUBLIC_FEE,
                        inputs: [
                            poll.id,
                            aleoAddress
                        ],
                        privateKey: privateKey
                    }).then(async (workerResponse) => {
                        const CREATING_EXECUTION_TRANSACTION_TIME = 30000;
                        await sleep(CREATING_EXECUTION_TRANSACTION_TIME);
                        const transaction = await networkClient.getTransaction(workerResponse.tx_id);
                        const encryptedRecord = RecordCiphertext.fromString(transaction.execution.transitions[0].outputs[0].value);
                        const record = encryptedRecord.decrypt(aleoAccount.viewKey()).toString();
                        await postMessagePromise(worker, {
                            type: "ALEO_EXECUTE_PROGRAM_ON_CHAIN",
                            programName: ZK_VOTING_PROGRAM_NAME,
                            functionName: VOTING_FUNCTION_NAME,
                            publicFee: PUBLIC_FEE,
                            inputs: [
                                record,
                                proposalIndex
                            ],
                            privateKey: privateKey
                        }).then(async () => {
                            await Swal.fire({
                                title: 'Success!',
                                text: 'You have successfully voted!',
                                icon: 'success',
                                confirmButtonText: 'Close'
                            });
                        }).catch(async (error) => {
                            await Swal.fire({
                                title: 'Error!',
                                text: 'Something went wrong while voting on-chain. Error: ' + error,
                                icon: 'error',
                                confirmButtonText: 'Return'
                            });
                        });
                    }).catch(async (error) => {
                        await Swal.fire({
                            title: 'Error!',
                            text: 'Something went wrong while finalizing ticket on-chain. Error: ' + error,
                            icon: 'error',
                            confirmButtonText: 'Return'
                        });
                    });
                } catch (error) {
                    await Swal.fire({
                        title: 'Error!',
                        text: 'Something went wrong while voting. Error: ' + error,
                        icon: 'error',
                        confirmButtonText: 'Return'
                    });
                }
            }
        });
    }

    checkVotes = async () => {
        const { poll } = this.props;
        const { ALEO_NODE_REST_API, worker, postMessagePromise } = this.context;
        await Swal.fire({
            title: 'Check vote count for your proposal',
            text: 'Enter the exact name of the proposal you want to check vote count for',
            input: 'text',
            inputPlaceholder: 'Enter your proposal',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off',
                showPasswordIcon: true
            },
            showCancelButton: true,
            confirmButtonText: 'Check',
            showLoaderOnConfirm: true,
            cancelButtonText: 'Cancel',
            preConfirm: async (proposal) => {
                if (!poll.proposals.includes(proposal)) {
                    Swal.showValidationMessage("Poll does not contain such proposal!");
                    return false;
                }
                return poll.proposals.indexOf(proposal).toString() + "u8";
            },
            allowOutsideClick: false,
        }).then(async (result) => {
            if (result.isDismissed) {
                await Swal.fire({
                    title: 'Are you sure you want to cancel checking votes?',
                    text: 'Cancelling checking votes returns you to page with all polls',
                    icon: 'question',
                    showConfirmButton: true,
                    confirmButtonText: 'No, I want to check votes',
                    showCancelButton: true,
                    cancelButtonText: 'Yes, I want to cancel'
                }).then(async (finalResult) => {
                    if (finalResult.isConfirmed) {
                        return await this.handleVoting();
                    } else if (finalResult.isDismissed) {
                        await Swal.fire({
                            title: 'Checking votes has been cancelled!',
                            icon: 'info',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true
                        });
                    }
                });
            } else if (result.isConfirmed && result.value) {
                try {
                    const proposalIndex = result.value;

                    const randomAleoAccount = new Account();
                    const SLOT_FUNCTION_NAME = "to_voting_slot";

                    Swal.fire({
                        title: 'Checking votes...',
                        html: 'Please wait while checking vote count for the proposal on the Aleo network...',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    await postMessagePromise(worker, {
                        type: "ALEO_EXECUTE_PROGRAM_OFF_CHAIN",
                        program: ID_HASHING_PROGRAM,
                        functionName: SLOT_FUNCTION_NAME,
                        inputs: [
                            poll.id,
                            proposalIndex
                        ],
                        privateKey: randomAleoAccount.privateKey().to_string()
                    }).then(async (workerResponse) => {
                        const votingSlot = (workerResponse.outputs)[0];
                        const networkClient = new AleoNetworkClient(ALEO_NODE_REST_API);
                        let voteCount = await networkClient.getProgramMappingValue("zk_voting.aleo", "votes", votingSlot);
                        if (voteCount) {
                            const POSTFIX_LENGTH = 3;
                            voteCount = voteCount.substring(0, voteCount.length - POSTFIX_LENGTH);
                        } else {
                            voteCount = "0";
                        }
                        await Swal.fire({
                            title: voteCount + ' people voted for this proposal',
                            icon: 'info',
                            confirmButtonText: 'Got it'
                        });
                    }).catch(async (error) => {
                        await Swal.fire({
                            title: 'Error!',
                            text: 'Something went wrong while querying vote mapping. Error: ' + error,
                            icon: 'error',
                            confirmButtonText: 'Return'
                        });
                    });
                } catch (error) {
                    await Swal.fire({
                        title: 'Error!',
                        text: 'Something went wrong while checking votes. Error: ' + error,
                        icon: 'error',
                        confirmButtonText: 'Return'
                    });
                }
            }
        });
    }

    render() {
        const { poll } = this.props;
        const { account } = this.context;

        return (
            <div>
                <div className='poll-item'>
                    <div><strong>{poll.title}</strong></div>
                    <div>
                        <img src={pollImage} alt={'[]'} className="poll-photo" />
                    </div>
                    <div className="grup-poll-info">
                        <p><strong>Question:</strong> "{poll.question}"</p>
                        <p><strong>Count of proposals:</strong> {poll.proposal_count} proposals</p>
                        <p><strong>Proposals:</strong> ["{poll.proposals.join("\"; \"")}"]</p>
                        <p><strong>Proposer: </strong> {poll.proposer}</p>
                        <p><strong>Duration:</strong> {poll.duration} Aleo blocks</p>
                        <p><strong>Expiration at:</strong> {poll.expiration} Aleo block</p>
                    </div>
                    {account && (
                        <button className="view-poll" onClick={this.handleVoting}>Vote</button>
                    )}
                    {!account && (
                        <Link to="/login" className="view-poll">
                            Log in to vote
                        </Link>
                    )}
                    <button className="view-poll" onClick={this.checkVotes}>Check votes</button>
                </div>
            </div>
        );
    }
}

export default PollTableItem;
