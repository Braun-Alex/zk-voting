import React, { useState, useEffect, useContext } from 'react';
import { AleoNetworkClient } from '@aleohq/sdk';
import axios from 'axios';
import { AuthContext } from '../Contexts/AuthContext';
import PollTableItem from './PollTableItem';
import '../css/PollMain.css';
import { toast } from 'react-toastify';

function bytesToCharArray(bytes) {
    return bytes.map(byte => String.fromCharCode(byte)).join('').split('\u0000')[0];
}

function parsePoll(serializedPollData) {
    let pollData = serializedPollData.replace(/(\w+):/g, '"$1":').replace(/u8/g, '').replace(/(aleo[a-z0-9]*),/g, '"$1",').replace(/u32/g, '');
    pollData = JSON.parse(pollData);
    pollData.title = bytesToCharArray(pollData.title);
    pollData.question = bytesToCharArray(pollData.question);
    pollData.proposals = pollData.proposals.map(proposal => bytesToCharArray(proposal)).filter(proposal => proposal !== '');
    return pollData;
}

const PollTable = () => {
    const [polls, setPolls] = useState([]);
    const { BACKEND_REST_API, ALEO_NODE_REST_API } = useContext(AuthContext);

    useEffect(() => {
        const fetchPolls = async () => {
            try {
                const pollIDs = await axios.get(`${BACKEND_REST_API}/all_polls`);
                let allPolls = [];
                const networkClient = new AleoNetworkClient(ALEO_NODE_REST_API);
                for (const pollID of pollIDs.data) {
                    const poll = await networkClient.getProgramMappingValue("zk_voting.aleo", "polls", pollID);
                    allPolls.push(parsePoll(poll));
                }
                if (allPolls.length !== 0) {
                    setPolls(allPolls);
                }
            } catch (error) {
                if (error.response) {
                    toast.error("Server denied access");
                } else if (error.request) {
                    toast.error("Server does not respond");
                } else {
                    toast.error("Something went wrong: " + error);
                }
            }
        };

        fetchPolls();
    }, []);

    if (polls.length !== 0) {
        return (
            <div className="poll-table">
                {polls.map(poll =>
                    <PollTableItem key={poll.proposal_count} poll={poll} />
                )}
            </div>
        );
    } else {
        return (
            <div>No polls at the moment.</div>
        )
    }
};

export default PollTable;
