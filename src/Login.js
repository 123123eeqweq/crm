import React, { useState, useRef } from 'react';
import './Login.css';

function Login({ onLogin }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (/^\d?$/.test(value)) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);

      if (value && index < 3) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const enteredPin = pin.join('');
    console.log('Sending PIN to server:', enteredPin, typeof enteredPin); // Добавляем логирование

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: enteredPin }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка авторизации');
      }

      // Сохраняем токен в localStorage
      localStorage.setItem('token', data.token);
      onLogin();
    } catch (err) {
      alert(err.message);
      setPin(['', '', '', '']);
      inputRefs.current[0].focus();
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Вход в систему</h2>
        <div className="pin-input-container">
          {pin.map((digit, index) => (
            <input
              key={index}
              type="text"
              className="pin-input"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              maxLength="1"
              ref={(el) => (inputRefs.current[index] = el)}
              autoFocus={index === 0}
            />
          ))}
        </div>
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}

export default Login;