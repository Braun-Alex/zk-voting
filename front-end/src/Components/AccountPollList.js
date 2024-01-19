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
                                <p><strong>ID:</strong> {poll.id}</p>
                                <p><strong>Title:</strong> {poll.title}</p>
                                <p><strong>Question:</strong> {poll.question}</p>
                                <p><strong>Count of proposals:</strong> {poll.proposal_count} proposals</p>
                                <p><strong>Proposals:</strong> ["{poll.proposals.join("\"; \"")}"]</p>
                                <p><strong>Duration:</strong> {poll.duration} Aleo blocks</p>
                            </li>
                        )}
                    </ul>
                )}
            </div>
        );
    }
}

export default withAuth(AccountPollList);
