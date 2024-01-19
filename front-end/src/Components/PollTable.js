import React, { useState, useEffect, useContext } from 'react';
import { AleoNetworkClient } from '@aleohq/sdk';
import axios from 'axios';
import { AuthContext } from '../Contexts/AuthContext';
import PollTableItem from './PollTableItem';
import '../css/PollMain.css';
import { toast } from 'react-toastify';

const PollTable = () => {
    const [polls, setPolls] = useState([]);
    const { BACKEND_REST_API, ALEO_NODE_REST_API, parsePoll } = useContext(AuthContext);

    useEffect(() => {
        const fetchPolls = async () => {
            try {
                const pollIDs = await axios.get(`${BACKEND_REST_API}/all_polls`);
                let allPolls = [];
                const networkClient = new AleoNetworkClient(ALEO_NODE_REST_API);
                for (const pollID of pollIDs.data) {
                    let poll = await networkClient.getProgramMappingValue("zk_voting.aleo", "polls", pollID);
                    const expiration = await networkClient.getProgramMappingValue("zk_voting.aleo", "poll_expiration", pollID);
                    poll = parsePoll(poll);
                    poll.id = pollID;
                    const POSTFIX_LENGTH = 3;
                    poll.expiration = expiration.substring(0, expiration.length - POSTFIX_LENGTH);
                    allPolls.push(poll);
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
                    <PollTableItem key={poll.id} poll={poll} />
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
