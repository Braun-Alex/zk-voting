import React, { Component } from 'react';
import axios from 'axios';
import { AuthContext } from '../Contexts/AuthContext';
import { withoutAuth } from '../Wrappers/WithoutAuth';
import { toast } from 'react-toastify';
import '../css/Auth.css';

class Login extends Component {
    static contextType = AuthContext;

    constructor(props) {
        super(props);
        this.state = {
            nickname: '',
            password: ''
        };

        this.handleInputChange = this.handleInputChange.bind(this);
        this.login = this.login.bind(this);
    }

    handleInputChange = (field, value) => {
        this.setState({ [field]: value } );
    }

    login = async (event) => {
        event.preventDefault();

        const { BACKEND_REST_API, saveTokens, tryLoginAccount } = this.context;
        const { nickname, password } = this.state;

        if (nickname === '' || password === '') {
            toast.error("All the fields are required to log in!");
            return;
        }

        const PASSWORD_MINIMAL_LENGTH = 13;

        if (password.length < PASSWORD_MINIMAL_LENGTH) {
            toast.error("Password must be at least 13 characters long!");
            return;
        }

        const formData = new URLSearchParams();
        formData.append('username', nickname);
        formData.append('password', password);

        const AUTH_API_URL = `${BACKEND_REST_API}/login`;

        try {
            const response = await axios.post(AUTH_API_URL, formData);
            saveTokens(response.data);
            await tryLoginAccount(false);
            toast.success("You have been successfully logged in!");
        } catch (error) {
            if (error.response) {
                toast.error("Auth data is incorrect. Please try again");
            } else if (error.request) {
                toast.error("Server does not respond");
            } else {
                toast.error("Something went wrong: " + error.message);
            }
        }
    }

    render() {
        const { nickname, password } = this.state;

        return (
            <>
                <h1 className="form-header">Log in</h1>

                <div className="form">
                    <form className="login-form" onSubmit={this.login}>
                        <div className="form-field">
                            <label>Nickname</label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(event) => this.handleInputChange('nickname', event.target.value)}
                            />
                        </div>

                        <div className="form-field">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => this.handleInputChange('password', event.target.value)}
                            />
                        </div>

                        <button type="submit" className="button-login">Log in</button>
                    </form>
                </div>
            </>
        );
    }
}

export default withoutAuth(Login);
