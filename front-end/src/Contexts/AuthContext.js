import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { PrivateKeyCiphertext, AleoNetworkClient } from '@provablehq/sdk';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const initialState = {
    BACKEND_REST_API: process.env.REACT_APP_BACKEND_REST_API,
    ALEO_NODE_REST_API: process.env.REACT_APP_ALEO_NODE_REST_API,
    isAuthenticated: false,
    account: null,
    accountPolls: null,
    worker: null,
    workerReady: false,
    setAuthHeader: () => {},
    saveTokens: () => {},
    getData: () => {},
    tryRefreshAccessToken: () => {},
    getAccountData: () => {},
    getAccountPolls: () => {},
    tryLoginAccount: () => {},
    logout: () => {},
    setWorker: () => {},
    setWorkerReady: () => {},
    postMessagePromise: () => {}
};

export const AuthContext = createContext(initialState);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [account, setAccount] = useState(null);
    const [accountPolls, setAccountPolls] = useState(null);

    const [worker, setWorker] = useState(null);
    const [workerReady, setWorkerReady] = useState(false);

    const BACKEND_REST_API = process.env.REACT_APP_BACKEND_REST_API;
    const ALEO_NODE_REST_API = process.env.REACT_APP_ALEO_NODE_REST_API;

    const setAuthHeader = (accessToken) => {
        axios.defaults.headers.common['Authorization'] = accessToken ? `Bearer ${accessToken}` : '';
    };

    const saveTokens = (data) => {
        const accessToken = data.access_token;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', data.refresh_token);
        setAuthHeader(accessToken);
    }

    const bytesToCharArray = (bytes) => {
        return bytes.map(byte => String.fromCharCode(byte)).join('').split('\u0000')[0];
    }

    const parsePoll = (serializedPollData) => {
        let pollData = serializedPollData.replace(/(\w+):/g, '"$1":').replace(/u8/g, '').replace(/(aleo[a-z0-9]*),/g, '"$1",').replace(/u32/g, '');
        pollData = JSON.parse(pollData);
        pollData.title = bytesToCharArray(pollData.title);
        pollData.question = bytesToCharArray(pollData.question);
        pollData.proposals = pollData.proposals.map(proposal => bytesToCharArray(proposal)).filter(proposal => proposal !== '');
        return pollData;
    }

    const getData = async (apiUrl) => {
        try {
            const response = await axios.get(apiUrl);
            return JSON.parse(response.data);
        } catch (error) {
            const accessToken = localStorage.getItem('access_token');
            if (accessToken) {
                const success = await tryRefreshAccessToken();
                if (success) {
                    try {
                        const response = await axios.get(apiUrl);
                        return JSON.parse(response.data);
                    } catch (error) {
                        return null;
                    }
                }
            }
        }
    }

    const tryRefreshAccessToken = async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        try {
            setAuthHeader(refreshToken);
            const response = await axios.get(`${BACKEND_REST_API}/refresh`);
            const accessToken = response.data.access_token;
            localStorage.setItem('access_token', accessToken);
            setAuthHeader(accessToken);
            return true;
        } catch (error) {
            logout();
            return false;
        }
    }

    const getAccountData = async (isUnlock) => {
        const account = await getData(`${BACKEND_REST_API}/profile`);
        if (account && isUnlock) {
            let accountPrivateKey = null;
            await Swal.fire({
                title: 'Password Required',
                text: 'Password required to perform this action',
                input: 'password',
                inputPlaceholder: 'Enter your password',
                inputAttributes: {
                    autocapitalize: 'off',
                    autocorrect: 'off',
                    showPasswordIcon: true
                },
                showCancelButton: true,
                confirmButtonText: 'Perform the action',
                showLoaderOnConfirm: true,
                cancelButtonText: 'Cancel the action',
                preConfirm: (password) => {
                    const PASSWORD_MINIMAL_LENGTH = 13;
                    if (password.length < PASSWORD_MINIMAL_LENGTH) {
                        Swal.showValidationMessage("Password must be at least 13 characters long!");
                        return false;
                    }
                    try {
                        accountPrivateKey = PrivateKeyCiphertext.fromString(account.private_key).decryptToPrivateKey(password);
                    } catch (error) {
                        Swal.showValidationMessage('Sorry, that did not work. Please try again');
                        return false;
                    }
                    return true;
                },
                allowOutsideClick: false,
            }).then(async (result) => {
                if (result.isDismissed) {
                    await Swal.fire({
                        title: 'Are you sure you want to cancel the action?',
                        text: 'Cancelling the action does not log out you',
                        icon: 'question',
                        showConfirmButton: true,
                        confirmButtonText: 'No, try again',
                        showCancelButton: true,
                        cancelButtonText: 'Yes, cancel'
                    }).then(async (finalResult) => {
                        if (finalResult.isConfirmed) {
                            return await getAccountData(isUnlock);
                        } else if (finalResult.isDismissed) {
                            await Swal.fire({
                                title: 'Action has been cancelled!',
                                icon: 'info',
                                showConfirmButton: false,
                                timer: 3000,
                                timerProgressBar: true
                            });
                        }
                    });
                } else if (result.isConfirmed && result.value) {
                    await Swal.fire({
                        title: 'Decrypting the Aleo account has been successful!',
                        icon: 'success',
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true
                    });
                }
            });
            if (accountPrivateKey) {
                return {
                    nickname: account.nickname,
                    address: accountPrivateKey.to_address().to_string(),
                    privateKey: accountPrivateKey.to_string(),
                    viewKey: accountPrivateKey.to_view_key().to_string(),
                    polls: account.polls
                };
            }
        } else if (account) {
            return {
                nickname: account.nickname,
                address: '<encrypted>',
                privateKey: '<encrypted>',
                viewKey: '<encrypted>',
                polls: account.polls
            }
        }
        return null;
    }

    const getAccountPolls = async (pollIDs) => {
        const polls = [];
        if (pollIDs) {
            const networkClient = new AleoNetworkClient(ALEO_NODE_REST_API);
            for (const pollID of pollIDs) {
                let poll = await networkClient.getProgramMappingValue("zk_voting.aleo", "polls", pollID);
                poll = parsePoll(poll);
                poll.id = pollID;
                polls.push(poll);
            }
            if (polls.length !== 0) {
                return polls;
            }
        }
        return null;
    }

    const tryLoginAccount = async (isUnlock) => {
        const accountData = await getAccountData(isUnlock);
        if (accountData) {
            setAccount(accountData);
            const polls = await getAccountPolls(accountData.polls);
            if (polls) {
                setAccountPolls(polls);
            }
            setIsAuthenticated(true);
            return true;
        }
        return false;
    }

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setAuthHeader(null);
        setAccount(null);
        setAccountPolls(null);
        setIsAuthenticated(false);
        toast.info("You have been logged out!");
    }

    function postMessagePromise(worker, message) {
        return new Promise((resolve, reject) => {
            worker.onmessage = (event) => {
                if (event.data.type === "ERROR") {
                    reject(new Error(event.data.errorMessage));
                } else {
                    resolve(event.data);
                }
            };
            worker.postMessage(message);
        });
    }

    useEffect(() => {
        const getAuthState = async () => {
            const access_token = localStorage.getItem('access_token');
            setAuthHeader(access_token);
            let success = false;
            if (access_token) {
                success = await tryLoginAccount(false);
            }
            setIsAuthenticated(success);
        };

        getAuthState();
    }, []);

    useEffect(() => {
        let worker = new Worker(new URL("../Workers/worker.js", import.meta.url), {
            type: "module",
        });
        setWorker(worker);

        worker.onmessage = (event) => {
            if (event.data.type === "ALEO_WORKER_READY") {
                setWorkerReady(true);
            }
        };

        return () => {
            worker.terminate();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ BACKEND_REST_API, ALEO_NODE_REST_API, isAuthenticated, account, accountPolls, worker, saveTokens, parsePoll, tryRefreshAccessToken, getAccountData, tryLoginAccount, logout, postMessagePromise }}>
            {children}
        </AuthContext.Provider>
    );
};
