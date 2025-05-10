import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { FaEdit, FaTrash } from 'react-icons/fa';
import './Capital.css';

// Инициализируем Socket.IO без токена, подключим его позже
let socket;

function Capital() {
  const [totalCapital, setTotalCapital] = useState(0);
  const [displayCapital, setDisplayCapital] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCapitalValue, setEditCapitalValue] = useState(totalCapital);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isEditProgressModalOpen, setIsEditProgressModalOpen] = useState(false);
  const [editProgressValue, setEditProgressValue] = useState(currentProgress);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [editGoalValue, setEditGoalValue] = useState(monthlyGoal);
  const [expenses, setExpenses] = useState([]);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    description: '',
    amount: '',
  });

  // Получаем токен внутри компонента
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Обновляем токен при монтировании
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    console.log('Token in Capital.js useEffect:', currentToken);
    setToken(currentToken);

    // Подключаемся к Socket.IO с актуальным токеном
    socket = io('http://localhost:5000', {
      auth: { token: currentToken },
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Загружаем данные с бэкенда при старте
  useEffect(() => {
    if (!token) {
      console.log('No token, redirecting to login');
      window.location.href = '/login';
      return;
    }

    console.log('Fetching capital with token:', token);
    fetch('http://localhost:5000/api/capital', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        console.log('Fetch response status:', res.status);
        if (!res.ok) throw new Error('Неавторизованный доступ');
        return res.json();
      })
      .then((data) => {
        console.log('Fetched capital data:', data);
        setTotalCapital(data.totalCapital);
        setDisplayCapital(data.totalCapital);
        setCurrentProgress(data.currentProgress);
        setMonthlyGoal(data.monthlyGoal);
        setExpenses(data.expenses || []);
      })
      .catch((err) => {
        console.error('Error fetching capital data:', err);
        localStorage.removeItem('token');
        window.location.href = '/login';
      });
  }, [token]); // Зависимость от token

  // Слушаем обновления от Socket.IO
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to Socket.IO');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      localStorage.removeItem('token');
      window.location.href = '/login';
    });

    socket.on('capitalUpdated', (data) => {
      console.log('Received capitalUpdated:', data);
      setTotalCapital(data.totalCapital);
      setDisplayCapital(data.totalCapital);
      setCurrentProgress(data.currentProgress);
      setMonthlyGoal(data.monthlyGoal);
      setExpenses(data.expenses || []);
    });

    return () => {
      socket.off('capitalUpdated');
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleCapitalSubmit = (e) => {
    e.preventDefault();
    const newCapital = parseFloat(editCapitalValue);
    if (!isNaN(newCapital) && newCapital >= 0) {
      setTotalCapital(newCapital);
      setIsEditModalOpen(false);
      socket.emit('capitalUpdate', {
        totalCapital: newCapital,
        currentProgress,
        monthlyGoal,
        expenses,
      });
    } else {
      alert('Пожалуйста, введите корректное число!');
    }
  };

  const handleProgressSubmit = (e) => {
    e.preventDefault();
    const value = parseFloat(editProgressValue);
    if (!isNaN(value) && value >= 0 && value <= monthlyGoal) {
      setCurrentProgress(value);
      setIsEditProgressModalOpen(false);
      socket.emit('capitalUpdate', {
        totalCapital,
        currentProgress: value,
        monthlyGoal,
        expenses,
      });
    } else if (value > monthlyGoal) {
      setCurrentProgress(monthlyGoal);
      setIsEditProgressModalOpen(false);
      socket.emit('capitalUpdate', {
        totalCapital,
        currentProgress: monthlyGoal,
        monthlyGoal,
        expenses,
      });
    } else {
      alert('Пожалуйста, введите корректное число!');
      setEditProgressValue(currentProgress);
    }
  };

  const handleGoalSubmit = (e) => {
    e.preventDefault();
    const newGoal = parseFloat(editGoalValue);
    if (!isNaN(newGoal) && newGoal > 0) {
      setMonthlyGoal(newGoal);
      setIsEditGoalModalOpen(false);
      let updatedProgress = currentProgress;
      if (currentProgress > newGoal) {
        updatedProgress = newGoal;
        setCurrentProgress(newGoal);
      }
      socket.emit('capitalUpdate', {
        totalCapital,
        currentProgress: updatedProgress,
        monthlyGoal: newGoal,
        expenses,
      });
    } else {
      alert('Пожалуйста, введите корректное число больше 0!');
    }
  };

  const handleExpenseInputChange = (e) => {
    const { name, value } = e.target;
    setNewExpense((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    const amount = parseFloat(newExpense.amount);
    if (newExpense.name && newExpense.description && !isNaN(amount) && amount > 0) {
      const newExpenseData = {
        name: newExpense.name,
        description: newExpense.description,
        amount: amount,
      };
      const updatedExpenses = [...expenses, newExpenseData];
      setExpenses(updatedExpenses);
      setNewExpense({ name: '', description: '', amount: '' });
      setIsAddExpenseModalOpen(false);
      socket.emit('capitalUpdate', {
        totalCapital,
        currentProgress,
        monthlyGoal,
        expenses: updatedExpenses,
      });
    } else {
      alert('Пожалуйста, заполните все поля корректно!');
    }
  };

  const handleDeleteExpense = (id) => {
    const updatedExpenses = expenses.filter((expense) => expense._id !== id);
    setExpenses(updatedExpenses);
    socket.emit('capitalUpdate', {
      totalCapital,
      currentProgress,
      monthlyGoal,
      expenses: updatedExpenses,
    });
  };

  const handleOverlayClick = (e, setModalOpen, resetState = () => {}) => {
    if (e.target === e.currentTarget) {
      setModalOpen(false);
      resetState();
    }
  };

  useEffect(() => {
    const start = displayCapital;
    const end = totalCapital;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = Math.round(start + (end - start) * progress);
      setDisplayCapital(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [totalCapital]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isEditModalOpen) {
          setIsEditModalOpen(false);
          setEditCapitalValue(totalCapital);
        }
        if (isEditProgressModalOpen) {
          setIsEditProgressModalOpen(false);
          setEditProgressValue(currentProgress);
        }
        if (isEditGoalModalOpen) {
          setIsEditGoalModalOpen(false);
          setEditGoalValue(monthlyGoal);
        }
        if (isAddExpenseModalOpen) {
          setIsAddExpenseModalOpen(false);
          setNewExpense({ name: '', description: '', amount: '' });
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isEditModalOpen, isEditProgressModalOpen, isEditGoalModalOpen, isAddExpenseModalOpen, totalCapital, monthlyGoal, currentProgress]);

  useEffect(() => {
    const particleContainer = document.querySelector('.balance-section');
    const particlesCount = 20;

    for (let i = 0; i < particlesCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      particleContainer.appendChild(particle);
    }
  }, []);

  const progressPercentage = monthlyGoal > 0 ? (currentProgress / monthlyGoal) * 100 : 0;

  const marks = [];
  const markStep = monthlyGoal > 0 ? Math.ceil(monthlyGoal / 5) : 1;
  for (let i = 0; i <= monthlyGoal; i += markStep) {
    const position = monthlyGoal > 0 ? (i / monthlyGoal) * 100 : 0;
    marks.push(
      <div
        key={i}
        className="mark"
        style={{ bottom: `${position}%` }}
      ></div>
    );
    marks.push(
      <div
        key={`${i}-label`}
        className="mark-label"
        style={{ bottom: `${position}%`, transform: 'translateY(50%)' }}
      >
        {i.toLocaleString('en-US')}$
      </div>
    );
  }

  return (
    <div className="capital-container">
      <h1>Капитал</h1>
      <div className="content-wrapper">
        <div className="balance-section">
          <div className="balance">
            Общий капитал: {displayCapital.toLocaleString('en-US')}
          </div>
          <button
            className="edit-button"
            onClick={() => {
              setEditCapitalValue(totalCapital);
              setIsEditModalOpen(true);
            }}
          >
            <FaEdit />
          </button>
        </div>

        <div className="main-content">
          <div className="expenses-section">
            <h2>Расходы</h2>
            <div className="total-expenses">
              Всего расходов: {totalExpenses.toLocaleString('en-US')}
            </div>
            <div className="expenses-list">
              {expenses.length === 0 ? (
                <p style={{ color: '#aaaaaa', textAlign: 'center' }}>
                  Нет расходов
                </p>
              ) : (
                expenses.map((expense) => (
                  <div className="expense-card" key={expense._id}>
                    <div className="expense-info">
                      <p>
                        <strong>{expense.name}</strong>
                      </p>
                      <p>{expense.description}</p>
                      <p className="amount">
                        -{expense.amount.toLocaleString('en-US')} 
                      </p>
                    </div>
                    <button
                      className="delete-expense-button"
                      onClick={() => handleDeleteExpense(expense._id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="expense-buttons">
              <button
                className="add-expense-button"
                onClick={() => setIsAddExpenseModalOpen(true)}
              >
                Добавить расход
              </button>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <h2>Цель на месяц: {monthlyGoal.toLocaleString('en-US')}</h2>
              <button
                className="edit-button"
                onClick={() => {
                  setEditGoalValue(monthlyGoal);
                  setIsEditGoalModalOpen(true);
                }}
              >
                <FaEdit />
              </button>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ height: `${progressPercentage}%` }}
              ></div>
              <div className="progress-marks">{marks}</div>
            </div>
            <div className="progress-display">
              <div className="progress-label">Заработано:</div>
              <div className="progress-value">
                {currentProgress.toLocaleString('en-US')} 
              </div>
              <button
                className="edit-button"
                onClick={() => {
                  setEditProgressValue(currentProgress);
                  setIsEditProgressModalOpen(true);
                }}
              >
                <FaEdit />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            handleOverlayClick(e, setIsEditModalOpen, () =>
              setEditCapitalValue(totalCapital)
            )
          }
        >
          <div className="modal">
            <h2>Редактировать капитал</h2>
            <form onSubmit={handleCapitalSubmit}>
              <input
                type="number"
                value={editCapitalValue}
                onChange={(e) => setEditCapitalValue(e.target.value)}
                placeholder="Введите сумму ()"
              />
              <div className="modal-buttons">
                <button type="submit">Сохранить</button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditCapitalValue(totalCapital);
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditProgressModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            handleOverlayClick(e, setIsEditProgressModalOpen, () =>
              setEditProgressValue(currentProgress)
            )
          }
        >
          <div className="modal">
            <h2>Редактировать заработанное</h2>
            <form onSubmit={handleProgressSubmit}>
              <input
                type="number"
                value={editProgressValue}
                onChange={(e) => setEditProgressValue(e.target.value)}
                placeholder="Введите сумму ()"
              />
              <div className="modal-buttons">
                <button type="submit">Сохранить</button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditProgressModalOpen(false);
                    setEditProgressValue(currentProgress);
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditGoalModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            handleOverlayClick(e, setIsEditGoalModalOpen, () =>
              setEditGoalValue(monthlyGoal)
            )
          }
        >
          <div className="modal">
            <h2>Редактировать цель</h2>
            <form onSubmit={handleGoalSubmit}>
              <input
                type="number"
                value={editGoalValue}
                onChange={(e) => setEditGoalValue(e.target.value)}
                placeholder="Введите цель ($)"
              />
              <div className="modal-buttons">
                <button type="submit">Сохранить</button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditGoalModalOpen(false);
                    setEditGoalValue(monthlyGoal);
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddExpenseModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            handleOverlayClick(e, setIsAddExpenseModalOpen, () =>
              setNewExpense({ name: '', description: '', amount: '' })
            )
          }
        >
          <div className="modal">
            <h2>Добавить расход</h2>
            <form onSubmit={handleAddExpense}>
              <input
                type="text"
                name="name"
                value={newExpense.name}
                onChange={handleExpenseInputChange}
                placeholder="KLVR/KLMN"
              />
              <textarea
                name="description"
                value={newExpense.description}
                onChange={handleExpenseInputChange}
                placeholder="На что потратил?"
              />
              <input
                type="number"
                name="amount"
                value={newExpense.amount}
                onChange={handleExpenseInputChange}
                placeholder="Сумма (...)"
              />
              <div className="modal-buttons">
                <button type="submit">Добавить</button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddExpenseModalOpen(false);
                    setNewExpense({ name: '', description: '', amount: '' });
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Capital;