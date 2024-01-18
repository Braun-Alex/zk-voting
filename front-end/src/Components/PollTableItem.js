import React, { Component } from 'react';
import {
    Account,
    AleoNetworkClient,
    NetworkRecordProvider,
    ProgramManager,
    AleoKeyProvider
} from '@aleohq/sdk';
import pollImage from '../img/voting.jpg';
import { AuthContext } from '../Contexts/AuthContext';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

const ZK_VOTING_PROGRAM = "program zk_voting.aleo;\n" +
    "\n" +
    "record Ticket:\n" +
    "    owner as address.private;\n" +
    "    poll_id as field.private;\n" +
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
    "mapping polls:\n" +
    "\tkey as field.public;\n" +
    "\tvalue as PollInfo.public;\n" +
    "\n" +
    "\n" +
    "mapping poll_expiration:\n" +
    "\tkey as field.public;\n" +
    "\tvalue as u32.public;\n" +
    "\n" +
    "\n" +
    "mapping tickets:\n" +
    "\tkey as field.public;\n" +
    "\tvalue as u64.public;\n" +
    "\n" +
    "\n" +
    "mapping votes:\n" +
    "\tkey as field.public;\n" +
    "\tvalue as u64.public;\n" +
    "\n" +
    "\n" +
    "mapping has_ticket:\n" +
    "\tkey as field.public;\n" +
    "\tvalue as boolean.public;\n" +
    "\n" +
    "function create_poll:\n" +
    "    input r0 as PollInfo.public;\n" +
    "    assert.eq self.caller r0.proposer;\n" +
    "    async create_poll r0 into r1;\n" +
    "    output r1 as zk_voting.aleo/create_poll.future;\n" +
    "\n" +
    "finalize create_poll:\n" +
    "    input r0 as PollInfo.public;\n" +
    "    hash.psd8 r0 into r1 as field;\n" +
    "    gte r0.proposal_count 2u8 into r2;\n" +
    "    lte r0.proposal_count 32u8 into r3;\n" +
    "    and r2 r3 into r4;\n" +
    "    assert.eq r4 true;\n" +
    "    contains polls[r1] into r5;\n" +
    "    not r5 into r6;\n" +
    "    assert.eq r6 true;\n" +
    "    add block.height r0.duration into r7;\n" +
    "    set r7 into poll_expiration[r1];\n" +
    "    set r0 into polls[r1];\n" +
    "    set 0u64 into tickets[r1];\n" +
    "\n" +
    "\n" +
    "function create_ticket:\n" +
    "    input r0 as field.public;\n" +
    "    input r1 as address.public;\n" +
    "    cast r1 r0 into r2 as Ticket.record;\n" +
    "    hash.psd8 r2 into r3 as field;\n" +
    "    async create_ticket r0 r3 into r4;\n" +
    "    output r2 as Ticket.record;\n" +
    "    output r4 as zk_voting.aleo/create_ticket.future;\n" +
    "\n" +
    "finalize create_ticket:\n" +
    "    input r0 as field.public;\n" +
    "    input r1 as field.public;\n" +
    "    get poll_expiration[r0] into r2;\n" +
    "    gt r2 block.height into r3;\n" +
    "    assert.eq r3 true;\n" +
    "    get.or_use has_ticket[r1] false into r4;\n" +
    "    not r4 into r5;\n" +
    "    assert.eq r5 true;\n" +
    "    set true into has_ticket[r1];\n" +
    "    get.or_use tickets[r0] 0u64 into r6;\n" +
    "    add r6 1u64 into r7;\n" +
    "    set r7 into tickets[r0];\n" +
    "\n" +
    "\n" +
    "function vote:\n" +
    "    input r0 as Ticket.record;\n" +
    "    input r1 as u8.public;\n" +
    "    async vote r0.poll_id r1 into r2;\n" +
    "    output r2 as zk_voting.aleo/vote.future;\n" +
    "\n" +
    "finalize vote:\n" +
    "    input r0 as field.public;\n" +
    "    input r1 as u8.public;\n" +
    "    get polls[r0] into r2;\n" +
    "    add r1 1u8 into r3;\n" +
    "    lte r3 r2.proposal_count into r4;\n" +
    "    assert.eq r4 true;\n" +
    "    get poll_expiration[r0] into r5;\n" +
    "    gt r5 block.height into r6;\n" +
    "    assert.eq r6 true;\n" +
    "    cast r1 into r7 as field;\n" +
    "    add r0 r7 into r8;\n" +
    "    hash.psd8 r8 into r9 as field;\n" +
    "    get.or_use votes[r9] 0u64 into r10;\n" +
    "    add r10 1u64 into r11;\n" +
    "    set r11 into votes[r9];";

class PollTableItem extends Component {
    static contextType = AuthContext;

    constructor(props) {
        super(props);

        this.handleVoting = this.handleVoting.bind(this);
    }

    handleVoting = async () => {
        const { poll } = this.props;
        const { ALEO_NODE_REST_API, account, getAccountData } = this.context;
        await Swal.fire({
            title: 'Vote privately for your proposal',
            text: 'Enter the exact name of the proposal you want privately vote for',
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
                    title: 'Are you sure you want to cancel the voting?',
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
                    const keyProvider = new AleoKeyProvider();
                    keyProvider.useCache(true);

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
                    const recordProvider = new NetworkRecordProvider(aleoAccount, networkClient);

                    const programManager = new ProgramManager(ALEO_NODE_REST_API, keyProvider, recordProvider);
                    programManager.setAccount(aleoAccount);

                    const ticketKeySearchParams = { "cacheKey": `zk_voting:${TICKET_FUNCTION_NAME}` };
                    const votingKeySearchParams = { "cacheKey": `zk_voting:${VOTING_FUNCTION_NAME}` };

                    Swal.fire({
                        title: 'Voting...',
                        html: 'Please wait while your vote is being privately casted on the Aleo network...',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    await programManager.run(
                        ZK_VOTING_PROGRAM,
                        TICKET_FUNCTION_NAME,
                        [
                            poll.id,
                            aleoAddress
                        ],
                        false).then(async (executionResponse) => {
                        const outputs = executionResponse.getOutputs();
                        const ticketRecord = outputs[0];
                        await programManager.execute(
                            ZK_VOTING_PROGRAM_NAME,
                            TICKET_FUNCTION_NAME,
                            PUBLIC_FEE,
                            false,
                            [
                                poll.id,
                                aleoAddress
                            ],
                            undefined,
                            ticketKeySearchParams
                        ).then(async () => {
                            await programManager.execute(
                                ZK_VOTING_PROGRAM_NAME,
                                VOTING_FUNCTION_NAME,
                                PUBLIC_FEE,
                                false,
                                [
                                    ticketRecord,
                                    proposalIndex
                                ],
                                undefined,
                                votingKeySearchParams
                            ).then(async () => {
                                await Swal.fire({
                                    title: 'You have successfully voted!',
                                    icon: 'success',
                                    showConfirmButton: false,
                                    timer: 3000,
                                    timerProgressBar: true
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
                    }).catch(async (error) => {
                        await Swal.fire({
                            title: 'Error!',
                            text: 'Something went wrong while creating ticket record. Error: ' + error,
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

    render() {
        const { poll } = this.props;
        const { account } = this.context;

        return (
            <div className='poll-item-container'>
                <div className='poll-item'>
                    <div><strong>{poll.title}</strong></div>
                    <div>
                        <img src={pollImage} alt={'[]'} className="poll-photo" />
                    </div>
                    <div className="grup-poll-info">
                        <p><strong>Question:</strong> "{poll.question}"</p>
                        <p><strong>Count of proposals:</strong> {poll.proposal_count} proposals</p>
                        <p><strong>Proposals:</strong> ["{poll.proposals.join("\"; \"")}"]</p>
                        <p><strong>Duration:</strong> {poll.duration} Aleo blocks</p>
                    </div>
                    {account && (
                        <button className="view-poll" onClick={this.handleVoting}>Vote</button>
                    )}
                    {!account && (
                        <Link to="/login" className="view-poll">
                            Log in to vote
                        </Link>
                    )}
                </div>
            </div>
        );
    }
}

export default PollTableItem;
