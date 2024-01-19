import React, { Component } from 'react';
import { Account } from '@aleohq/sdk';
import '../css/Modal.css'
import Modal from 'react-modal';
import Dropdown from 'react-dropdown';
import 'react-dropdown/style.css';
import { AuthContext } from '../Contexts/AuthContext';
import { withAuth } from '../Wrappers/WithAuth';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import axios from 'axios';

const MAX_LENGTH = 32;

function charArrayToByteArray(charArray) {
    const byteArray = new TextEncoder().encode(charArray);
    const byteCharArray = Array.from(byteArray, byte => byte.toString());
    while (byteCharArray.length < MAX_LENGTH) {
        byteCharArray.push("0");
    }
    return byteCharArray.map(byteChar => byteChar + "u8");
}

function hasDuplicates(array) {
    const set = new Set(array);
    return array.length !== set.size;
}

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

class CreatePoll extends Component {
    static contextType = AuthContext;

    constructor(props) {
        super(props);
        this.state = {
            pollData: {
                title: '',
                question: '',
                proposals: [],
                proposal_count: '',
                duration: '',
            }
        };
    }

    handleInputChange = (field, value) => {
        this.setState(prevState => {
            if (field.startsWith('proposals')) {
                const index = parseInt(field.split('[')[1], 10);
                let newProposals = [...prevState.pollData.proposals];
                newProposals[index] = value;
                return {
                    pollData: { ...prevState.pollData, proposals: newProposals }
                };
            } else if (field === 'proposal_count') {
                const proposalCount = parseInt(value, 10);
                const proposals = new Array(proposalCount).fill('');
                return {
                    pollData: { ...prevState.pollData, proposals, proposal_count: value }
                };
            } else {
                return {
                    pollData: { ...prevState.pollData, [field]: value }
                };
            }
        });
    };

    createPoll = async () => {
        const { title, question, proposals, proposal_count, duration } = this.state.pollData;
        const { BACKEND_REST_API, account, worker, tryRefreshAccessToken, getAccountData, postMessagePromise } = this.context;
        try {
            const REGEX = /^[A-Za-z0-9]*$/;
            const QUESTION_REGEX = /^[A-Za-z0-9?]*$/;

            if (title.length === 0) {
                toast.error("Title must not be empty!");
                return;
            }

            if (title.length > MAX_LENGTH) {
                toast.error("Title must be less than 33 characters long!");
                return;
            }

            if (!REGEX.test(title)) {
                toast.error("Title must contain only Latin letters and digits!");
                return;
            }

            if (question.length === 0) {
                toast.error("Question must not be empty!");
                return;
            }

            if (question.length > MAX_LENGTH) {
                toast.error("Question must be less than 33 characters long!");
                return;
            }

            if (!QUESTION_REGEX.test(title)) {
                toast.error("Title must contain only Latin letters, digits, and a question mark!");
                return;
            }

            for (let i = 0; i < proposal_count; i++) {
                if (proposals[i].length === 0) {
                    toast.error(`Proposal ${i} must not be empty!`);
                    return;
                }

                if (proposals[i].length > MAX_LENGTH) {
                    toast.error(`Proposal ${i} must be less than 33 characters long!`);
                    return;
                }

                if (!REGEX.test(proposals[i])) {
                    toast.error(`Proposal ${i} must contain only Latin letters and digits!`);
                    return;
                }
            }

            if (hasDuplicates(proposals)) {
                toast.error("The proposals must not duplicate!");
                return;
            }

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

            const aleoAccount = new Account( { privateKey: privateKey } );

            const ZK_VOTING_PROGRAM_NAME = "zk_voting.aleo";
            const CREATING_POLL_FUNCTION_NAME = "create_poll";
            const POLL_ID_FUNCTION_NAME = "to_poll_id";
            const PUBLIC_FEE = 300000;

            const TITLE = charArrayToByteArray(title);
            const QUESTION = charArrayToByteArray(question);
            const PROPOSALS = proposals.map((proposal) => charArrayToByteArray(proposal));

            while (PROPOSALS.length < MAX_LENGTH) {
                PROPOSALS.push(Array(32).fill("0u8"));
            }

            const PROPOSAL_COUNT = proposal_count + "u8";
            const PROPOSER = aleoAccount.address().to_string();
            const DURATION = duration + "u32";

            let POLL = "{" +
                "title: [" + TITLE.join(", ") + "], " +
                "question: [" + QUESTION.join(", ") + "], " +
                "proposals: [";

            for (let i = 0; i < MAX_LENGTH - 1; i++) {
                POLL += "[" + PROPOSALS[i].join(", ") + "], ";
            }

            POLL += "[" + PROPOSALS[MAX_LENGTH - 1].join(", ") + "]";

            POLL += "], " +
                "proposal_count: " + PROPOSAL_COUNT + ", " +
                "proposer: " + PROPOSER + ", " +
                "duration: " + DURATION +
                "}";

            Swal.fire({
                title: 'Creating the poll...',
                html: 'Please wait while your poll is being created on the Aleo network...',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                await postMessagePromise(worker, {
                    type: "ALEO_EXECUTE_PROGRAM_ON_CHAIN",
                    programName: ZK_VOTING_PROGRAM_NAME,
                    functionName: CREATING_POLL_FUNCTION_NAME,
                    publicFee: PUBLIC_FEE,
                    inputs: [POLL],
                    privateKey: privateKey
                }).then(async () => {
                    await postMessagePromise(worker, {
                        type: "ALEO_EXECUTE_PROGRAM_OFF_CHAIN",
                        program: ID_HASHING_PROGRAM,
                        functionName: POLL_ID_FUNCTION_NAME,
                        inputs: [POLL],
                        privateKey: privateKey
                    }).then(async (workerResponse) => {
                        const pollID = (workerResponse.outputs)[0];
                        const ADD_POLL_API_URL = `${BACKEND_REST_API}/add_poll`;
                        try {
                            await axios.post(ADD_POLL_API_URL, {
                                poll_id: pollID
                            });
                            await Swal.fire({
                                title: 'Success!',
                                text: 'Poll has been successfully created!',
                                icon: 'success',
                                confirmButtonText: 'Close'
                            });
                        } catch (error) {
                            if (error.response) {
                                const successfullyRefreshed = await tryRefreshAccessToken();
                                if (successfullyRefreshed) {
                                    await axios.post(ADD_POLL_API_URL, {
                                        poll: pollID
                                    });
                                    await Swal.fire({
                                        title: 'Success!',
                                        text: 'Poll has been successfully created!',
                                        icon: 'success',
                                        confirmButtonText: 'Close'
                                    });
                                } else {
                                    toast.error("Server denied access");
                                }
                            } else if (error.request) {
                                toast.error("Server does not respond");
                            } else {
                                toast.error("Something went wrong: " + error.message);
                            }
                        }
                    }).catch(async (error) => {
                        await Swal.fire({
                            title: 'Error!',
                            text: 'Something went wrong while getting poll ID output and adding the poll on backend: ' + error,
                            icon: 'error',
                            confirmButtonText: 'Return'
                        });
                    });
                }).catch(async (error) => {
                    await Swal.fire({
                        title: 'Error!',
                        text: 'Something went wrong while id_hashing.aleo to_poll_id function execution and adding the poll on backend: ' + error,
                        icon: 'error',
                        confirmButtonText: 'Return'
                    });
                }).finally(() => {
                    Swal.close();
                });
            } catch (error) {
                await Swal.fire({
                    title: 'Error!',
                    text: 'Something went wrong while Aleo programs functions executing and adding the poll on backend: ' + error.message,
                    icon: 'error',
                    confirmButtonText: 'Return'
                });
            }
            this.props.onHide();
        } catch (error) {
            await Swal.fire({
                title: 'Error!',
                text: 'Something went wrong while creating a poll: ' + error.message,
                icon: 'error',
                confirmButtonText: 'Return'
            });
        }
    }

    render() {
        const { show, onHide } = this.props;
        const { proposals } = this.state.pollData;

        const modalStyles = {
            display: show ? 'block' : 'none',
        };
        const overlayStyles = {
            display: show ? 'block' : 'none',
        };

        const proposalCountOptions = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
            '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32'];
        const durationOptions = ['5', '20', '50', '100', '500', '1000', '5000', '10000'];
        const defaultOption = null;

        return (
            <>
                <div className="overlay" style={overlayStyles}>
                    <Modal
                        ariaHideApp={false}
                        isOpen={show}
                        onRequestClose={onHide}
                        className="modal"
                        style={modalStyles}
                        centered
                    >
                        <div className='modal-content'>
                            <span className="close" onClick={onHide}>&times;</span>
                            <div>
                                <div className="add-poll-header">
                                    Create a poll
                                </div>
                            </div>
                            <div>
                                <form className='add-poll-container'>
                                    <div className="poll-text">
                                        <label>Title</label>
                                        <input type="text" onChange={(e) => this.handleInputChange('title', e.target.value)} />
                                    </div>
                                    <div className="poll-text">
                                        <label>Question</label>
                                        <input type="text" onChange={(e) => this.handleInputChange('question', e.target.value)} />
                                    </div>
                                    <div>
                                        <Dropdown
                                            options={proposalCountOptions}
                                            value={defaultOption}
                                            placeholder="Count of proposals"
                                            className="poll-proposal-count"
                                            onChange={(option) => this.handleInputChange('proposal_count', option.value)}
                                        />
                                    </div>
                                    {proposals.map((proposal, index) =>
                                        <div className="poll-text" key={index}>
                                            <label>{`Proposal ${index + 1}`}</label>
                                            <input type="text"
                                                   value={proposal}
                                                   onChange={(e) => this.handleInputChange(`proposals[${index}]`, e.target.value)} />
                                        </div>
                                    )}
                                    <div>
                                        <Dropdown
                                            options={durationOptions}
                                            value={defaultOption}
                                            placeholder="Duration, Aleo blocks"
                                            className="poll-duration"
                                            onChange={(option) => this.handleInputChange('duration', option.value)} />
                                    </div>
                                </form>
                            </div>

                            <button className="create-poll-button" onClick={this.createPoll}>Create the poll</button>
                        </div>
                    </Modal>
                </div>
            </>
        );
    }
}

export default withAuth(CreatePoll);
