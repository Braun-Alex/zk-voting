import React, { Component } from 'react';
import {
    Account,
    AleoNetworkClient,
    NetworkRecordProvider,
    ProgramManager,
    AleoKeyProvider
} from '@aleohq/sdk';
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

const ID_HASHING_PROGRAM = "program id_hashing.aleo {\n" +
    "    struct PollInfo {\n" +
    "        title: [u8; 32],\n" +
    "        question: [u8; 32],\n" +
    "        proposals: [[u8; 32]; 32],\n" +
    "        proposal_count: u8,\n" +
    "        proposer: address,\n" +
    "        duration: u32,\n" +
    "    }\n" +
    "\n" +
    "    transition to_poll_id(public info: PollInfo) -> field {\n" +
    "        let poll_id: field = Poseidon8::hash_to_field(info);\n" +
    "        return poll_id;\n" +
    "    }\n" +
    "\n" +
    "    transition to_voting_slot(public poll_id: field, public proposal_id: u8) -> field {\n" +
    "        let voting_slot: field = Poseidon8::hash_to_field(poll_id + proposal_id as field);\n" +
    "        return voting_slot;\n" +
    "    }\n" +
    "}";

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
        const { BACKEND_REST_API, ALEO_NODE_REST_API, account, getAccountData } = this.context;
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

            const networkClient = new AleoNetworkClient(ALEO_NODE_REST_API);
            const recordProvider = new NetworkRecordProvider(aleoAccount, networkClient);

            const programManager = new ProgramManager(ALEO_NODE_REST_API, keyProvider, recordProvider);
            programManager.setAccount(aleoAccount);
            const keySearchParams = { "cacheKey": `zk_voting:${CREATING_POLL_FUNCTION_NAME}` };

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
                await programManager.execute(
                    ZK_VOTING_PROGRAM_NAME,
                    CREATING_POLL_FUNCTION_NAME,
                    PUBLIC_FEE,
                    false,
                    [POLL],
                    undefined,
                    keySearchParams
                ).then(async () => {
                    await programManager.run(
                        ID_HASHING_PROGRAM,
                        POLL_ID_FUNCTION_NAME,
                        [POLL],
                        false).then(async (executionResponse) => {
                        const pollID = executionResponse.getOutputs();
                        const ADD_POLL_API_URL = `${BACKEND_REST_API}/add_poll`;
                        const formData = new URLSearchParams();
                        formData.append('poll', pollID[0]);
                        try {
                            await axios.post(ADD_POLL_API_URL, formData);
                            await Swal.fire({
                                title: 'Success!',
                                text: 'Poll has been successfully created!',
                                icon: 'success',
                                confirmButtonText: 'Close'
                            });
                        } catch (error) {
                            if (error.response) {
                                toast.error("Server denied access");
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
                                            placeholder="Duration, Aleo Testnet3 blocks"
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
