import React, { useState, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';
import './Ideas.css';

function Ideas({ socket }) { // Принимаем socket как пропс
  const [ideas, setIdeas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [newIdea, setNewIdea] = useState({
    title: '',
    author: '',
    description: '',
  });

  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    console.log('Token in Ideas.js useEffect:', currentToken);
    setToken(currentToken);

    if (!currentToken) {
      console.log('No token, redirecting to login');
      window.location.href = '/login';
      return;
    }

    console.log('Fetching ideas with token:', currentToken);
    fetch('https://631f-147-45-43-26.ngrok-free.app/api/ideas', {
  headers: {
    Authorization: `Bearer ${currentToken}`,
    'ngrok-skip-browser-warning': 'true', // Добавляем заголовок
  },
})
  .then((res) => {
    console.log('Fetch response status:', res.status);
    if (!res.ok) throw new Error('Неавторизованный доступ');
    return res.json();
  })
      .then((data) => {
        console.log('Fetched ideas:', data);
        setIdeas(data);
      })
      .catch((err) => {
        console.error('Error fetching ideas:', err);
        localStorage.removeItem('token');
        window.location.href = '/login';
      });
  }, []);

  useEffect(() => {
    if (socket) { // Проверяем, что socket передан
      socket.on('connect', () => {
      });

      socket.on('connect_error', (err) => {
        console.error('Socket.IO connection error in Ideas:', err.message);
        // Не перенаправляем на логин, так как это обрабатывается в App.js
      });

      socket.on('ideaAdded', (newIdea) => {
        console.log('Received ideaAdded:', newIdea);
        setIdeas((prev) => [...prev, newIdea]);
      });

      socket.on('ideaDeleted', (ideaId) => {
        console.log('Received ideaDeleted:', ideaId);
        setIdeas((prev) => prev.filter((idea) => idea._id !== ideaId));
        if (selectedIdea && selectedIdea._id === ideaId) {
          setIsIdeaModalOpen(false);
          setSelectedIdea(null);
        }
      });

      return () => {
        socket.off('ideaAdded');
        socket.off('ideaDeleted');
        socket.off('connect');
        socket.off('connect_error');
      };
    }
  }, [socket, selectedIdea]); // Добавляем socket как зависимость

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewIdea((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newIdea.title && newIdea.author && newIdea.description) {
      socket.emit('ideaAdd', {
        title: newIdea.title,
        author: newIdea.author,
        description: newIdea.description,
      });
      setNewIdea({ title: '', author: '', description: '' });
      setIsModalOpen(false);
    } else {
      alert('Пожалуйста, заполните все поля!');
    }
  };

  const handleDelete = (id) => {
    socket.emit('ideaDelete', id);
    setIsIdeaModalOpen(false);
    setSelectedIdea(null);
  };

  const handleOverlayClick = (e, setModalOpen) => {
    if (e.target === e.currentTarget) {
      setModalOpen(false);
      setNewIdea({ title: '', author: '', description: '' });
      setSelectedIdea(null);
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
          setNewIdea({ title: '', author: '', description: '' });
        }
        if (isIdeaModalOpen) {
          setIsIdeaModalOpen(false);
          setSelectedIdea(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen, isIdeaModalOpen]);

  return (
    <div className="ideas-container">
      <h1>Планы</h1>
      <div className="ideas-list">
        {ideas.map((idea) => (
          <div
            className="idea-card"
            key={idea._id}
            onClick={() => {
              setSelectedIdea(idea);
              setIsIdeaModalOpen(true);
            }}
          >
            <div className="idea-info">
              <h3>{idea.title}</h3>
              <p className="author">{idea.author}</p>
              <p>{idea.description}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        className="add-idea-button"
        onClick={() => setIsModalOpen(true)}
      >
        Добавить план
      </button>

      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => handleOverlayClick(e, setIsModalOpen)}
        >
          <div className="modal">
            <h2>Добавить план</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="title"
                value={newIdea.title}
                onChange={handleInputChange}
                placeholder="Заголовок"
              />
              <input
                type="text"
                name="author"
                value={newIdea.author}
                onChange={handleInputChange}
                placeholder="KLVR/KLMN"
              />
              <textarea
                name="description"
                value={newIdea.description}
                onChange={handleInputChange}
                placeholder="Описание плана"
              />
              <div className="modal-buttons">
                <button type="submit">Добавить</button>
                <button
                  type="button"
                  onClick={() =>
                    setNewIdea({
                      title: '',
                      author: '',
                      description: '',
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

      {isIdeaModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => handleOverlayClick(e, setIsIdeaModalOpen)}
        >
          <div className="modal idea-modal">
            <button
              className="delete-button"
              onClick={() => handleDelete(selectedIdea._id)}
            >
              <FaTrash />
            </button>
            <div className="idea-modal-content">
              <h3>{selectedIdea.title}</h3>
              <p className="author">{selectedIdea.author}</p>
              <p className="description">{selectedIdea.description}</p>
            </div>
            <button
              className="close-button"
              onClick={() => {
                setIsIdeaModalOpen(false);
                setSelectedIdea(null);
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ideas;