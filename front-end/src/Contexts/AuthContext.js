import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { PrivateKeyCiphertext, AleoNetworkClient } from '@aleohq/sdk';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const initialState = {
    BACKEND_REST_API: 'http://localhost:8080',
    ALEO_NODE_REST_API: 'http://localhost:3033',
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

    const BACKEND_REST_API = 'http://localhost:8080';
    const ALEO_NODE_REST_API = 'http://localhost:3033';

    const setAuthHeader = (accessToken) => {
        axios.defaults.headers.common['Authorization'] = accessToken ? `Bearer ${accessToken}` : '';
    };

    const saveTokens = (data) => {
        const accessToken = data.access_token;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', data.refresh_token);
        setAuthHeader(accessToken);
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
        const networkClient = new AleoNetworkClient(ALEO_NODE_REST_API);
        if (pollIDs) {
            for (const pollID of pollIDs) {
                const poll = networkClient.getProgramMappingValue("zk_voting.aleo", "polls", pollID);
                polls.push({
                    id: pollID,
                    title: poll.title,
                    question: poll.question,
                    proposal_count: poll.proposal_count,
                    proposals: poll.proposals,
                    proposer: poll.proposer,
                    duration: poll.duration
                });
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
                resolve(event.data);
            };
            worker.onerror = (error) => {
                reject(error);
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
    }, [isAuthenticated]);

    return (
        <AuthContext.Provider value={{ BACKEND_REST_API, ALEO_NODE_REST_API, isAuthenticated, account, accountPolls, worker, saveTokens, tryRefreshAccessToken, getAccountData, tryLoginAccount, logout, postMessagePromise }}>
            {children}
        </AuthContext.Provider>
    );
};
