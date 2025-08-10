import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import UserList from './UserList';
import MessageInput from './MessageInput';
import './Chat.css';

const socket = io('https://chatbackend-production-603c.up.railway.app');

const Chat = () => {
  const [username, setUsername] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  //const [isTyping, setIsTyping] = useState(false);// TODO: Se usará para funcionalidad futura
  const [typingUser, setTypingUser] = useState(null);
  const [error, setError] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);

  // Efecto para manejar la conexión y eventos del socket
  useEffect(() => {
    // Evento para éxito de registro
    socket.on('registrationSuccess', (data) => {
      setCurrentUser(data.currentUser);
      setConnectedUsers(data.otherUsers);
      setUnreadCounts(data.unreadCounts || {});
    });

    // Evento para error de registro
    socket.on('registrationError', (errorMessage) => {
      setError(errorMessage);
    });

    // Evento para nuevo mensaje recibido
    socket.on('newMessage', (message) => {
      if (selectedUser === message.from) {
        // Si está viendo el chat, agregar mensaje y marcar como leído
        setMessages(prev => [...prev, message]);
        socket.emit('markAsRead', {
          sender: message.from, 
          receiver: currentUser
        });
      } else {
        // Si no está viendo el chat, actualizar contador de no leídos
        setUnreadCounts(prev => ({
          ...prev,
          [message.from]: (prev[message.from] || 0) + 1
        }));
      }
    });

    // Evento para confirmación de mensaje enviado
    socket.on('messageSent', (message) => {
      if (selectedUser === message.to) {
        setMessages(prev => [...prev, message]);
      }
    });

    // Evento para mensajes marcados como leídos
    socket.on('messagesRead', ({ by }) => {
      if (selectedUser === by) {
        // Actualizar visualmente los mensajes como leídos si es necesario
        setMessages(prev => prev.map(msg => ({
          ...msg,
          read: true
        })));
      }
    });

    // Eventos para usuarios conectados/desconectados
    socket.on('userConnected', (user) => {
      setConnectedUsers(prev => [...prev, user]);
    });

    socket.on('userDisconnected', (username) => {
      setConnectedUsers(prev => prev.filter(u => u.username !== username));
      if (selectedUser === username) {
        setSelectedUser(null);
      }
      // Eliminar de contadores no leídos si existe
      setUnreadCounts(prev => {
        const newCounts = {...prev};
        delete newCounts[username];
        return newCounts;
      });
    });

    // Eventos para typing
    socket.on('userTyping', (username) => {
      if (selectedUser === username) {
        setTypingUser(username);
      }
    });

    socket.on('userStoppedTyping', () => {
      setTypingUser(null);
    });

    // Limpieza al desmontar
    return () => {
      socket.off('registrationSuccess');
      socket.off('registrationError');
      socket.off('newMessage');
      socket.off('messageSent');
      socket.off('messagesRead');
      socket.off('userConnected');
      socket.off('userDisconnected');
      socket.off('userTyping');
      socket.off('userStoppedTyping');
    };
  }, [selectedUser, currentUser]);

  // Limpiar notificaciones al cambiar de chat
  useEffect(() => {
  if (selectedUser && unreadCounts[selectedUser]) {
    setUnreadCounts(prev => {
      const newCounts = {...prev};
      delete newCounts[selectedUser];
      return newCounts;
    });
  }
}, [selectedUser, unreadCounts]); // Añade unreadCounts a las dependencias

  // Auto-scroll al actualizar mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    if (username.trim()) {
      socket.emit('register', username.trim());
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user.username);
    // Usar el nuevo método para obtener historial
    socket.emit('getChatHistory', { 
      withUser: user.username,
      currentUser: currentUser
    }, (messages) => {
      setMessages(messages);
    });
  };

  const handleSendMessage = (messageText) => {
    if (messageText.trim() && selectedUser) {
      socket.emit('privateMessage', {
        to: selectedUser,
        from: currentUser,
        message: messageText.trim()
      });
    }
  };

  const handleTyping = (isTyping) => {
    if (selectedUser) {
      if (isTyping) {
        socket.emit('typing', { to: selectedUser, from: currentUser });
      } else {
        socket.emit('stopTyping', { to: selectedUser, from: currentUser });
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="auth-container">
        <form onSubmit={handleRegister}>
          <h2>Ingresa tu nombre de usuario</h2>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nombre de usuario"
            required
          />
          {error && <div className="error-message">{error}</div>}
          <button type="submit">Entrar al chat</button>
        </form>
      </div>
    );
  }

  return (
      <div className="chat-container">
      <div className="users-list-container">
        <div className="company-header">
          <h2 className="company-name">SDH Inc</h2>
          <p className="chats-label">Chats</p>
        </div>
        <UserList 
          users={connectedUsers}
          currentUser={currentUser}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          unreadCounts={unreadCounts}
        />
      </div>
      
      <div className="chat-area">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <h3>Chat con {selectedUser}</h3>
              {typingUser && (
                <div className="typing-indicator">
                  {typingUser} está escribiendo...
                </div>
              )}
            </div>
            
            <div className="messages-container">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.from === currentUser ? 'sent' : 'received'} ${!msg.read && msg.from !== currentUser ? 'unread' : ''}`}
                >
                  <div className="message-header">
                    <strong>{msg.from}</strong>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                      {msg.read && msg.from === currentUser && ' ✓✓'}
                    </span>
                  </div>
                  <div className="message-content">{msg.message}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <MessageInput 
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              disabled={!selectedUser}
            />
          </>
        ) : (
          <div className="select-user-prompt">
            <p>Selecciona un usuario para comenzar a chatear</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;