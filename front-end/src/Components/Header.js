import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from "../Contexts/AuthContext";
import '../css/Header.css';

function Header() {
    const { account, logout } = useContext(AuthContext);
    return (
        <>
            <header>
                <div className='header-container'>
                    <div className="header-left">
                        <Link to="/">Home</Link>
                        <Link to="/poll-main">Polls</Link>
                    </div>

                    <div className="header-right">
                        {account ? (
                            <>
                                {account && <Link to="/account" className="nickname-header">{account.nickname}</Link>}
                                <Link to="/" className="logout-button" onClick={logout}>Log out</Link>
                            </>
                        ): (
                            <>
                                <Link to="/login" className="login-button">Log in</Link>
                                <Link to="/signup" className="signup-button">Sign up</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>
        </>

    );
}

export default Header;
