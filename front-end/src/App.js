import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Home from './Pages/Home';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import Header from './Components/Header';
import Account from './Pages/Account';
import Polls from './Pages/PollMain';
import './App.css'
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
      <div>
          <Header />
          <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/poll-main' element={<Polls />} />
              <Route path='/login' element={<Login />} />
              <Route path='/signup' element={<Signup />} />
              <Route path='/account' element={<Account />} />
          </Routes>
          <ToastContainer position="top-center" autoClose={5000} />
      </div>

  );
}

export default App;
