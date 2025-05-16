import React, { useState, useEffect } from 'react';
import { FaTrello, FaDollarSign, FaLightbulb, FaUsers } from 'react-icons/fa';
import { io } from 'socket.io-client'; // Импортируем Socket.IO
import Login from './Login';
import Board from './Board';
import Capital from './Capital';
import Ideas from './Ideas';
import Team from './Team';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token')); // Проверяем токен при загрузке
  const [activeSection, setActiveSection] = useState('Доска');
  const [socket, setSocket] = useState(null); // Состояние для Socket.IO

  // Инициализация Socket.IO после логина
useEffect(() => {
  if (isLoggedIn) {
    const token = localStorage.getItem('token');

    const newSocket = io('https://631f-147-45-43-26.ngrok-free.app', {
      auth: {
        token: token,
      },
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true', // Добавляем заголовок для Socket.IO
      },
    });

    newSocket.on('connect_error', (error) => {
      if (error.message === 'Токен отсутствует' || error.message === 'Недействительный токен') {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }
}, [isLoggedIn]);

  const sections = {
    'Доска': { component: <Board socket={socket} />, icon: <FaTrello /> },
    'Капитал': { component: <Capital socket={socket} />, icon: <FaDollarSign /> },
    'Идеи': { component: <Ideas socket={socket} />, icon: <FaLightbulb /> },
    'Команда': { component: <Team socket={socket} />, icon: <FaUsers /> },
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-container">
      {sections[activeSection].component}
      <div className="nav-menu">
        {Object.keys(sections).map((section) => (
          <button
            key={section}
            className={`nav-button ${activeSection === section ? 'active' : ''}`}
            onClick={() => setActiveSection(section)}
          >
            {sections[section].icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;