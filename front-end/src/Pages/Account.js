import React, { Component } from 'react';
import accountIcon from '../img/accountIcon.png';
import AccountPollList from '../Components/AccountPollList';
import { AuthContext } from '../Contexts/AuthContext';
import { withAuth } from '../Wrappers/WithAuth';
import pollIcon from '../img/pollIcon.png';
import accountImage from '../img/account.png';
import '../css/Account.css';
import '../css/AccountPollList.css';

class Account extends Component {
    static contextType = AuthContext;

    constructor(props) {
        super(props);

        this.state = {
            photo: null,
            showAccount: true,
            showPolls: false
        };

        this.handleFileChange = this.handleFileChange.bind(this);
        this.toggleAccount = this.toggleAccount.bind(this);
        this.togglePolls = this.togglePolls.bind(this);
    }

    toggleAccount = () => {
        this.setState({
            showAccount: true,
            showPolls: false
        });
    };

    togglePolls = () => {
        this.setState({
            showAccount: false,
            showPolls: true
        });
    };

    handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.setState({ photo: e.target.result });
            };
            reader.readAsDataURL(file);
        }
    };

    render() {
        const { showAccount, showPolls } = this.state;
        const { account, tryLoginAccount } = this.context;

        if (!account) {
            return <div>Loading...</div>;
        }

        return (
            <div className="container">
                <div className="account-photo-greeting">
                    <label className="photo-container">
                        <input type="file" accept="image/*" onChange={this.handleFileChange} style={{ display: 'none' }} />
                        {accountImage ? (
                            <img src={accountImage} alt="Avatar" className="selected-photo" style={{ objectFit: 'cover' }} />
                        ): (
                            <div>Photo</div>
                        )}
                    </label>
                    <div className="account-options">
                        <button className={`${showAccount ? 'active-account-option': 'inactive-account-option'}`} onClick={this.toggleAccount}>
                            <img src={accountIcon} alt="Information about account" /> Profile
                        </button>

                        <button className={`${showPolls ? 'active-account-option': 'inactive-account-option'}`} onClick={this.togglePolls}>
                            <img src={pollIcon} alt="Information about account polls" /> My polls
                        </button>
                    </div>
                </div>

                <div className="account-options-open">

                    {showAccount && (
                        <>
                            <div className="accountInfo">
                                <p>
                                    <label><strong>Address: </strong></label>
                                    <span id="private_key">{account.address}</span>
                                </p>

                                <p>
                                    <label><strong>Private key: </strong></label>
                                    <span id="private_key">{account.privateKey}</span>
                                </p>

                                <p>
                                    <label><strong>View key: </strong></label>
                                    <span id="view_key">{account.viewKey}</span>
                                </p>
                            </div>
                            {account.address === '<encrypted>' && (
                                <button
                                    aria-controls=""
                                    onClick={async () => await tryLoginAccount(true)}
                                    className="add-poll-button"
                                >
                                    Decrypt the Aleo account
                                </button>
                            )}
                            {account.address !== '<encrypted>' && (
                                <button
                                    aria-controls=""
                                    onClick={async () => await tryLoginAccount(false)}
                                    className="add-poll-button"
                                >
                                    Encrypt the Aleo account
                                </button>
                            )}
                        </>
                    )}

                    {showPolls && <AccountPollList />}

                </div>
            </div>
        )
    }
}

export default withAuth(Account);
