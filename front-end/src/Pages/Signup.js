import React, { Component } from 'react';
import axios from 'axios';
import { AuthContext } from '../Contexts/AuthContext';
import { withoutAuth } from '../Wrappers/WithoutAuth';
import { Account, PrivateKey, PrivateKeyCiphertext } from '@aleohq/sdk';
import { toast } from 'react-toastify';
import '../css/Auth.css';

class Signup extends Component {
    static contextType = AuthContext;

    constructor(props) {
        super(props);
        this.state = {
            nickname: '',
            address: '',
            privateKey: '',
            viewKey: '',
            password: ''
        };
    }

    handleInputChange = (field, value) => {
        this.setState({ [field]: value });
    }

    register = () => {
        const { nickname, address, privateKey, viewKey, password } = this.state;
        const { BACKEND_REST_API } = this.context;

        if (nickname === '' || address === '' || privateKey === '' || viewKey === '' || password === '') {
            toast.error("All the fields are required to sign up!");
            return;
        }

        const PASSWORD_MINIMAL_LENGTH = 13;

        if (password.length < PASSWORD_MINIMAL_LENGTH) {
            toast.error("Password must be at least 13 characters long!");
            return;
        }

        const SIGNUP_API_URL = `${BACKEND_REST_API}/signup`;

        axios.post(SIGNUP_API_URL, {
            nickname: nickname,
            private_key: PrivateKeyCiphertext.encryptPrivateKey(PrivateKey.from_string(privateKey),
                password).toString(),
            password: password
        }).then(() => {
            toast.success("You have been successfully signed up!");
        }).catch((error) => {
            if (error.response) {
                toast.error("The same account already exists");
            } else if (error.request) {
                toast.error("Server does not respond");
            } else {
                toast.error("Something went wrong: " + error.message);
            }
        });
    }

    generateRandomAccount = () => {
        const account = new Account();
        this.setState({
            address: account.address().to_string(),
            privateKey: account.privateKey().to_string(),
            viewKey: account.viewKey().to_string()
        })
    }

    render() {
        const { address, privateKey, viewKey } = this.state;
        return (
            <>
                <h1 className="form-header">Sign up</h1>

                <div className="form">

                    <form className="registration-form">

                        <div className="form-field">
                            <label>Nickname</label>
                            <input
                                type="text"
                                onChange={(event) => this.handleInputChange('nickname', event.target.value)}
                            />
                        </div>

                        <div className="form-field">
                            <label>Aleo address</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(event) => this.handleInputChange('address', event.target.value)}
                            />
                        </div>

                        <div className="form-field">
                            <label>Aleo private key</label>
                            <input
                                type="text"
                                value={privateKey}
                                onChange={(event) => this.handleInputChange('privateKey', event.target.value)}
                            />
                        </div>

                        <div className="form-field">
                            <label>Aleo view key</label>
                            <input
                                type="text"
                                value={viewKey}
                                onChange={(event) => this.handleInputChange('viewKey', event.target.value)}
                            />
                        </div>

                        <div className="form-field">
                            <label>Password</label>
                            <input
                                type="password"
                                onChange={(event) => this.handleInputChange('password', event.target.value)}
                            />
                        </div>

                    </form>

                    <button className="button-reg" onClick={this.generateRandomAccount}>Generate random account</button>

                    <button className="button-reg" onClick={this.register}>Sign up</button>

                </div>
            </>
        );
    }
}

export default withoutAuth(Signup);
