import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { FaTrash } from 'react-icons/fa';
import './Team.css';

// Инициализируем Socket.IO без токена, подключим его позже
let socket;

function Team() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newMember, setNewMember] = useState({
    name: '',
    position: '',
    telegram: '',
    salary: '',
    description: '',
    avatar: null,
  });

  // Получаем токен внутри компонента
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Обновляем токен при монтировании
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    console.log('Token in Team.js useEffect:', currentToken);
    setToken(currentToken);

    // Подключаемся к Socket.IO с актуальным токеном
    socket = io('http://localhost:5000', {
      auth: { token: currentToken },
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Загружаем участников с бэкенда при старте
  useEffect(() => {
    if (!token) {
      console.log('No token, redirecting to login');
      window.location.href = '/login';
      return;
    }

    console.log('Fetching team with token:', token);
    fetch('http://localhost:5000/api/team', {
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
        console.log('Fetched team members:', data);
        setTeamMembers(data);
      })
      .catch((err) => {
        console.error('Error fetching team members:', err);
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

    socket.on('memberAdded', (newMember) => {
      console.log('Received memberAdded:', newMember);
      setTeamMembers((prev) => [...prev, newMember]);
    });

    socket.on('memberDeleted', (memberId) => {
      console.log('Received memberDeleted:', memberId);
      setTeamMembers((prev) => prev.filter((member) => member._id !== memberId));
      if (selectedMember && selectedMember._id === memberId) {
        setIsMemberModalOpen(false);
        setSelectedMember(null);
      }
    });

    return () => {
      socket.off('memberAdded');
      socket.off('memberDeleted');
      socket.off('connect');
      socket.off('connect_error');
    };
  }, [selectedMember]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMember((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMember((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      newMember.name &&
      newMember.position &&
      newMember.telegram &&
      newMember.salary &&
      newMember.avatar
    ) {
      socket.emit('memberAdd', {
        name: newMember.name,
        position: newMember.position,
        telegram: newMember.telegram,
        salary: newMember.salary,
        description: newMember.description || 'Нет описания',
        avatar: newMember.avatar,
      });
      setNewMember({ name: '', position: '', telegram: '', salary: '', description: '', avatar: null });
      setIsModalOpen(false);
    } else {
      alert('Пожалуйста, заполните все обязательные поля и загрузите аватарку!');
    }
  };

  const handleDelete = (id) => {
    socket.emit('memberDelete', id);
    setIsMemberModalOpen(false);
    setSelectedMember(null);
  };

  const handleOverlayClick = (e, setModalOpen, resetState = () => {}) => {
    if (e.target === e.currentTarget) {
      setModalOpen(false);
      resetState();
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
          setNewMember({ name: '', position: '', telegram: '', salary: '', description: '', avatar: null });
        }
        if (isMemberModalOpen) {
          setIsMemberModalOpen(false);
          setSelectedMember(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen, isMemberModalOpen]);

  return (
    <div className="team-container">
      <h1>Команда</h1>
      <div className="team-list">
        {teamMembers.map((member) => (
          <div
            className="team-member"
            key={member._id}
            onClick={() => {
              setSelectedMember(member);
              setIsMemberModalOpen(true);
            }}
          >
            <img src={member.avatar} alt={member.name} />
            <div className="member-info">
              <h3>{member.name}</h3>
              <p className="position">{member.position}</p>
              <p>Telegram: {member.telegram}</p>
              <p>Зарплата: {member.salary}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        className="add-member-button"
        onClick={() => setIsModalOpen(true)}
      >
        Добавить участника
      </button>

      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            handleOverlayClick(e, setIsModalOpen, () =>
              setNewMember({ name: '', position: '', telegram: '', salary: '', description: '', avatar: null })
            )
          }
        >
          <div className="modal">
            <h2>Добавить участника</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                value={newMember.name}
                onChange={handleInputChange}
                placeholder="Имя"
              />
              <input
                type="text"
                name="position"
                value={newMember.position}
                onChange={handleInputChange}
                placeholder="Должность"
              />
              <input
                type="text"
                name="telegram"
                value={newMember.telegram}
                onChange={handleInputChange}
                placeholder="Telegram (например, @username)"
              />
              <input
                type="text"
                name="salary"
                value={newMember.salary}
                onChange={handleInputChange}
                placeholder="Зарплата (например, 100,000/мес)"
              />
              <textarea
                name="description"
                value={newMember.description}
                onChange={handleInputChange}
                placeholder="Описание (что делает)"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              <div className="modal-buttons">
                <button type="submit">Добавить</button>
                <button
                  type="button"
                  onClick={() =>
                    setNewMember({
                      name: '',
                      position: '',
                      telegram: '',
                      salary: '',
                      description: '',
                      avatar: null,
                    }) & setIsModalOpen(false)
                  }
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMemberModalOpen && selectedMember && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            handleOverlayClick(e, setIsMemberModalOpen, () => setSelectedMember(null))
          }
        >
          <div className="modal member-modal">
            <div className="modal-header">
              <h2>{selectedMember.name}</h2>
              <button
                className="delete-icon"
                onClick={() => handleDelete(selectedMember._id)}
              >
                <FaTrash />
              </button>
            </div>
            <p>
              <strong>Должность:</strong> {selectedMember.position}
            </p>
            <p>
              <strong>Telegram:</strong> {selectedMember.telegram}
            </p>
            <p>
              <strong>Зарплата:</strong> {selectedMember.salary}
            </p>
            <p>
              <strong>Описание:</strong> {selectedMember.description}
            </p>
            <div className="modal-buttons">
              <button
                type="button"
                onClick={() => {
                  setIsMemberModalOpen(false);
                  setSelectedMember(null);
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Team;