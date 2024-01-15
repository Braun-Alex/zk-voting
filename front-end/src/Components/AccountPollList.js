import React, { Component } from 'react';
import '../css/AccountPollList.css';
import { AuthContext } from '../Contexts/AuthContext';
import { withAuth } from '../Wrappers/WithAuth';
import CreatePoll from './CreatePoll';

class AccountPollList extends Component {
    static contextType = AuthContext;

    constructor(props) {
        super(props);
        this.state = {
            pollFormVisible: false
        }
    }

    render() {
        const { pollFormVisible } = this.state;
        const { accountPolls } = this.context;
        return (
            <div className="poll-from-account">
                <button
                    aria-controls=""
                    onClick={() => this.setState({ pollFormVisible: true })}
                    className="add-poll-button"
                >
                    Create a poll
                </button>
                {!accountPolls && (
                    <div>You did not create any polls at the moment.</div>
                )}
                <CreatePoll show={pollFormVisible} onHide={() => { this.setState({ pollFormVisible: false }) }} />
                {accountPolls && (
                    <ul className="list">
                        {accountPolls.map(poll =>
                            <li className="list-item">
                                <p><strong>Title:</strong> {poll.title}</p>
                                <p><strong>Question:</strong> {poll.question}</p>
                                <p><strong>Proposal count:</strong> {poll.proposal_count}</p>
                                <p><strong>Proposals:</strong> {poll.proposals}</p>
                                <p><strong>Duration in Aleo Testnet3 blocks:</strong> {poll.duration}</p>
                            </li>
                        )}
                    </ul>
                )}
            </div>
        );
    }
}

export default withAuth(AccountPollList);
