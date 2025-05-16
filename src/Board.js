import React, { useState, useRef, useEffect } from 'react';
import './Board.css';

function Board({ socket }) {
  const [columns, setColumns] = useState({
    Масик_1: [],
    Масик_2: [],
    Хуй: [],
  });
  const [isAdding, setIsAdding] = useState({});
  const [newTask, setNewTask] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [colorMenu, setColorMenu] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const boardRef = useRef(null);
  const contextMenuRef = useRef(null);
  const colorMenuRef = useRef(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    setToken(currentToken);

    if (!currentToken) {
      window.location.href = '/login';
      return;
    }

    fetch('https://f541-89-22-227-119.ngrok-free.app/api/tasks', {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'ngrok-skip-browser-warning': 'true',
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Неавторизованный доступ: ${res.status}`);
        }
        return res.json();
      })
      .then((tasks) => {
        const newColumns = {
          KLMN: [],
          KLVR: [],
          Надо_сделать: [],
        };
        tasks.forEach((task) => {
          const normalizedColumn = task.column.replace(' ', '_');
          if (newColumns[normalizedColumn]) {
            newColumns[normalizedColumn].push(task);
          }
        });
        setColumns(newColumns);
      })
      .catch((err) => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      });
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {});
      socket.on('connect_error', (err) => {});
      socket.on('taskUpdated', (task) => {
        const normalizedColumn = task.column.replace(' ', '_');
        setColumns((prev) => {
          const newColumns = { ...prev };
          if (newColumns[normalizedColumn]) {
            const taskIndex = newColumns[normalizedColumn].findIndex((t) => t._id === task._id);
            if (taskIndex !== -1) {
              newColumns[normalizedColumn][taskIndex] = task;
            } else {
              newColumns[normalizedColumn].push(task);
            }
          }
          return newColumns;
        });
        if (newTask && task.title === newTask) {
          setNewTask('');
          setIsAdding((prev) => ({ ...prev, [normalizedColumn]: false }));
        }
      });

      socket.on('taskDeleted', (taskId) => {
        setColumns((prev) => {
          const newColumns = { ...prev };
          Object.keys(newColumns).forEach((col) => {
            newColumns[col] = newColumns[col].filter((t) => t._id !== taskId);
          });
          return newColumns;
        });
      });

      return () => {
        socket.off('taskUpdated');
        socket.off('taskDeleted');
        socket.off('connect');
        socket.off('connect_error');
      };
    }
  }, [socket, newTask]);

  const toggleTask = (column, taskId, event) => {
    setColumns((prev) => {
      const newColumns = { ...prev };
      const task = newColumns[column].find((t) => t._id === taskId);
      if (task) {
        task.completed = !task.completed;
        socket.emit('taskUpdate', task);
      }
      return newColumns;
    });

    if (!columns[column].find((task) => task._id === taskId).completed) {
      const taskElement = event.currentTarget;
      const checkbox = taskElement.querySelector('.checkbox');
      const rect = checkbox.getBoundingClientRect();
      const board = boardRef.current;

      for (let i = 0; i < 8; i++) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        const angle = (i * 360) / 8;
        const distance = 50 + Math.random() * 20;
        firework.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
        firework.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
        firework.style.left = `${rect.left + rect.width / 2}px`;
        firework.style.top = `${rect.top + rect.height / 2}px`;
        board.appendChild(firework);
        setTimeout(() => firework.remove(), 800);
      }
    }
  };

  const handleAddTask = (column) => {
    if (newTask.trim()) {
      const task = {
        title: newTask,
        completed: false,
        color: null,
        startTime: null,
        elapsedTime: null,
        column: column.replace('_', ' '),
      };
      socket.emit('taskUpdate', task);
    }
  };

  const handleDeleteTask = (taskId, column) => {
    socket.emit('taskDelete', taskId);
    setContextMenu(null);
    setColorMenu(null);
    setEditTask(null);
  };

  const handleContextMenu = (e, taskId, column) => {
    e.preventDefault();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      taskId,
      column,
    });
    setColorMenu(null);
    setEditTask(null);
  };

  const handleColorMenu = (e) => {
    e.stopPropagation();
    setColorMenu({
      x: contextMenu.x + 100,
      y: contextMenu.y,
      taskId: contextMenu.taskId,
      column: contextMenu.column,
    });
  };

  const handleColorSelect = (color) => {
    setColumns((prev) => {
      const newColumns = { ...prev };
      const task = newColumns[contextMenu.column].find((t) => t._id === contextMenu.taskId);
      if (task) {
        task.color = color;
        socket.emit('taskUpdate', task);
      }
      return newColumns;
    });
    setContextMenu(null);
    setColorMenu(null);
  };

  const handleStartTimer = (taskId, column) => {
    setColumns((prev) => {
      const newColumns = { ...prev };
      const task = newColumns[column].find((t) => t._id === taskId);
      if (task) {
        const startTime = Date.now();
        task.startTime = startTime;
        task.elapsedTime = 0;
        task.timer = setInterval(() => {
          setColumns((prevCols) => {
            const updatedColumns = { ...prevCols };
            const t = updatedColumns[column].find((t) => t._id === taskId);
            if (t && t.startTime) {
              t.elapsedTime = Date.now() - startTime;
            }
            return updatedColumns;
          });
        }, 1000);
        socket.emit('taskUpdate', task);
      }
      return newColumns;
    });
    setContextMenu(null);
  };

  const handleStopTimer = (taskId, column) => {
    setColumns((prev) => {
      const newColumns = { ...prev };
      const task = newColumns[column].find((t) => t._id === taskId);
      if (task) {
        clearInterval(task.timer);
        task.completed = true;
        task.timer = null;
        task.startTime = null;
        socket.emit('taskUpdate', task);
      }
      return newColumns;
    });
    setContextMenu(null);
  };

  const handleEditTask = (taskId, column) => {
    const task = columns[column].find((t) => t._id === taskId);
    setEditTask({ taskId, column, title: task.title });
    setContextMenu(null);
  };

  const handleEditSubmit = (taskId, column) => {
    if (editTask.title.trim()) {
      setColumns((prev) => {
        const newColumns = { ...prev };
        const task = newColumns[column].find((t) => t._id === taskId);
        if (task) {
          task.title = editTask.title;
          socket.emit('taskUpdate', task);
        }
        return newColumns;
      });
    }
    setEditTask(null);
  };

  const formatTime = (ms) => {
    if (!ms) return '0:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target) &&
        (!colorMenuRef.current || !colorMenuRef.current.contains(e.target))
      ) {
        setContextMenu(null);
        setColorMenu(null);
        setEditTask(null);
      }
      if (
        Object.values(isAdding).some((adding) => adding) &&
        !e.target.closest('.add-task-form') &&
        !e.target.closest('.add-task-button')
      ) {
        setIsAdding({});
        setNewTask('');
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isAdding]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setColorMenu(null);
        setIsAdding({});
        setNewTask('');
        setEditTask(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const isColumnsLoaded = Object.keys(columns).length > 0;

  return (
    <div className="board-container" ref={boardRef}>
      <h1 style={{ color: '#ffffff', textAlign: 'center', marginBottom: '20px' }}>
        Доска задач
      </h1>
      {isColumnsLoaded && (
        <div className="board">
          {Object.keys(columns).map((column) => (
            <div className="column" key={column}>
              <h2>{column.replace('_', ' ')}</h2>
              {columns[column].map((task) => (
                <div
                  key={task._id}
                  className={`task ${task.completed ? 'completed' : ''}`}
                  style={{
                    background: task.color || 'rgba(255, 255, 255, 0.05)',
                    border: task.color ? `2px solid ${task.color}` : 'none',
                    boxShadow: task.color ? `0 0 8px ${task.color}` : '0 2px 8px rgba(0, 0, 0, 0.3)',
                  }}
                  onClick={(e) => toggleTask(column, task._id, e)}
                  onContextMenu={(e) => handleContextMenu(e, task._id, column)}
                >
                  <div className="checkbox"></div>
                  <div className="task-content">
                    {editTask && editTask.taskId === task._id ? (
                      <div className="edit-task-form">
                        <input
                          type="text"
                          className="add-task-input"
                          value={editTask.title}
                          onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                          autoFocus
                        />
                        <button
                          className="add-task-submit"
                          onClick={() => handleEditSubmit(task._id, column)}
                        >
                          Сохранить
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="task-title">{task.title}</span>
                        {task.elapsedTime !== null && (
                          <span className={`timer ${task.startTime ? 'active' : 'stopped'}`}>
                            {formatTime(task.elapsedTime)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {isAdding[column] ? (
                <div className="add-task-form">
                  <input
                    type="text"
                    className="add-task-input"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Введите название задачи"
                    autoFocus
                  />
                  <button
                    className="add-task-submit"
                    onClick={() => handleAddTask(column)}
                  >
                    Добавить
                  </button>
                </div>
              ) : (
                <button
                  className="add-task-button"
                  onClick={() => setIsAdding((prev) => ({ ...prev, [column]: true }))}
                >
                  Добавить задачу
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          ref={contextMenuRef}
        >
          <div className="context-menu-item" onClick={handleColorMenu}>
            Выбрать цвет
          </div>
          <div
            className="context-menu-item"
            onClick={() => handleEditTask(contextMenu.taskId, contextMenu.column)}
          >
            Редактировать
          </div>
          {columns[contextMenu.column].find((task) => task._id === contextMenu.taskId).startTime ? (
            <div
              className="context-menu-item"
              onClick={() => handleStopTimer(contextMenu.taskId, contextMenu.column)}
            >
              Завершить
            </div>
          ) : (
            <div
              className="context-menu-item"
              onClick={() => handleStartTimer(contextMenu.taskId, contextMenu.column)}
            >
              Начать
            </div>
          )}
          <div
            className="context-menu-item"
            onClick={() => handleDeleteTask(contextMenu.taskId, contextMenu.column)}
          >
            Удалить
          </div>
        </div>
      )}

      {colorMenu && (
        <div
          className="color-menu"
          style={{ top: colorMenu.y, left: colorMenu.x }}
          ref={colorMenuRef}
        >
          <div
            className="color-menu-item"
            style={{ backgroundColor: '#a94442' }}
            onClick={() => handleColorSelect('#a94442')}
          >
            <span className="color-icon" style={{ backgroundColor: '#a94442' }}></span>
            Красный
          </div>
          <div
            className="color-menu-item"
            style={{ backgroundColor: '#e07b39' }}
            onClick={() => handleColorSelect('#e07b39')}
          >
            <span className="color-icon" style={{ backgroundColor: '#e07b39' }}></span>
            Оранжевый
          </div>
        </div>
      )}
    </div>
  );
}

export default Board;