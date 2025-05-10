import React, { useState } from 'react';
import { FaTrello, FaDollarSign, FaLightbulb, FaUsers } from 'react-icons/fa';
import Login from './Login';
import Board from './Board';
import Capital from './Capital';
import Ideas from './Ideas';
import Team from './Team';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSection, setActiveSection] = useState('Доска');

  const sections = {
    'Доска': { component: <Board />, icon: <FaTrello /> },
    'Капитал': { component: <Capital />, icon: <FaDollarSign /> },
    'Идеи': { component: <Ideas />, icon: <FaLightbulb /> },
    'Команда': { component: <Team />, icon: <FaUsers /> },
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