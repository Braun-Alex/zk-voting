import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../Contexts/AuthContext';
import voting from '../img/voting.jpg';
import pollIcon from '../img/pollIcon.png';
import '../css/Home.css';


const Home = () => {
    const { isAuthenticated } = useContext(AuthContext);
    return (
        <div className="main-container">

            <div className="left-side">
                <img className="main-photo" src={voting} alt="main-photo" />
            </div>

            <div className="right-side">
                <Link to="/poll-main">
                    <button className='view-polls'>View all polls</button>
                </Link>
                {isAuthenticated && (
                    <Link to="/account" className='view-poll'>
                        Create a poll <img src={pollIcon} alt="poll" />
                    </Link>
                )}
            </div>

        </div>
    );
};

export default Home;
