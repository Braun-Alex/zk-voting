import React from 'react';
import '../css/PollMain.css';
import PollTable from "../Components/PollTable.js"

const PollMain = () => {
    return (
        <div className="poll-main-container">
            <div className='title-poll-main'>All polls</div>

            <div className="poll-table-container">
                <PollTable />
            </div>
        </div>
    );
};

export default PollMain;
