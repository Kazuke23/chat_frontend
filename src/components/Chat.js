// Importación de librerías y componentes
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import UserList from './UserList';       // Lista de usuarios conectados
import MessageInput from './MessageInput'; // Caja de texto para enviar mensajes
import './Chat.css';                    // Estilos del chat

// Conexión con el servidor usando Socket.IO
const socket = io(process.env.REACT_APP_BACKEND_URL, {
  transports: ['websocket'] // Fuerza el uso de WebSockets
});

const Chat = () => {
  // Estados principales
  const [username, setUsername] = useState('');         // Nombre de usuario ingresado
  const [currentUser, setCurrentUser] = useState('');   // Usuario actual
  const [connectedUsers, setConnectedUsers] = useState([]); // Lista de usuarios conectados
  const [selectedUser, setSelectedUser] = useState(null);   // Usuario con el que estamos chateando
  const [messages, setMessages] = useState([]);         // Mensajes del chat actual
  const [typingUser, setTypingUser] = useState(null);   // Usuario que está escribiendo
  const [error, setError] = useState('');               // Mensaje de error
  const [unreadCounts, setUnreadCounts] = useState({}); // Contadores de mensajes no leídos
  const [showUserList, setShowUserList] = useState(true); // Mostrar/ocultar lista de usuarios en móviles
  const messagesEndRef = useRef(null); // Referencia para hacer scroll automático al final del chat

  // ==============================
  // EFECTO: Configuración de eventos de Socket.IO
  // ==============================
  useEffect(() => {
    // Registro exitoso
    socket.on('registrationSuccess', (data) => {
      setCurrentUser(data.currentUser);
      setConnectedUsers(data.otherUsers);
      setUnreadCounts(data.unreadCounts || {});
    });

    // Error en el registro
    socket.on('registrationError', (errorMessage) => {
      setError(errorMessage);
    });

    // Nuevo mensaje recibido
    socket.on('newMessage', (message) => {
      if (selectedUser === message.from) {
        // Si el chat abierto es con ese usuario, se agrega directamente
        setMessages(prev => [...prev, message]);
        // Marcar como leído
        socket.emit('markAsRead', {
          sender: message.from,
          receiver: currentUser
        });
      } else {
        // Si no está abierto, aumentar contador de no leídos
        setUnreadCounts(prev => ({
          ...prev,
          [message.from]: (prev[message.from] || 0) + 1
        }));
      }
    });

    // Confirmación de mensaje enviado
    socket.on('messageSent', (message) => {
      if (selectedUser === message.to) {
        setMessages(prev => [...prev, message]);
      }
    });

    // Mensajes marcados como leídos
    socket.on('messagesRead', ({ by }) => {
      if (selectedUser === by) {
        setMessages(prev => prev.map(msg => ({
          ...msg,
          read: true
        })));
      }
    });

    // Usuario conectado
    socket.on('userConnected', (user) => {
      setConnectedUsers(prev => [...prev, user]);
    });

    // Usuario desconectado
    socket.on('userDisconnected', (username) => {
      setConnectedUsers(prev => prev.filter(u => u.username !== username));
      if (selectedUser === username) {
        setSelectedUser(null);
      }
      // Eliminar contador de no leídos
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[username];
        return newCounts;
      });
    });

    // Usuario está escribiendo
    socket.on('userTyping', (username) => {
      if (selectedUser === username) {
        setTypingUser(username);
      }
    });

    // Usuario dejó de escribir
    socket.on('userStoppedTyping', () => {
      setTypingUser(null);
    });

    // Limpieza de eventos al desmontar el componente
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

  // ==============================
  // EFECTO: Limpiar contador de mensajes no leídos
  // ==============================
  useEffect(() => {
    if (selectedUser && unreadCounts[selectedUser]) {
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[selectedUser];
        return newCounts;
      });
    }
  }, [selectedUser, unreadCounts]);

  // ==============================
  // EFECTO: Scroll automático al final del chat
  // ==============================
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para hacer scroll al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ==============================
  // Manejo de registro de usuario
  // ==============================
  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    if (username.trim()) {
      socket.emit('register', username.trim());
    }
  };

  // ==============================
  // Selección de usuario para chatear
  // ==============================
  const handleSelectUser = (user) => {
    setSelectedUser(user.username);
    // Cargar historial de chat con ese usuario
    socket.emit('getChatHistory', {
      withUser: user.username,
      currentUser: currentUser
    }, (messages) => {
      setMessages(messages);
    });

    // En móviles, ocultar lista de usuarios al seleccionar uno
    if (window.innerWidth <= 1024) {
      setShowUserList(false);
    }
  };

  // ==============================
  // Enviar mensaje privado
  // ==============================
  const handleSendMessage = (messageText) => {
    if (messageText.trim() && selectedUser) {
      socket.emit('privateMessage', {
        to: selectedUser,
        from: currentUser,
        message: messageText.trim()
      });
    }
  };

  // ==============================
  // Notificar que el usuario está o no escribiendo
  // ==============================
  const handleTyping = (isTyping) => {
    if (selectedUser) {
      if (isTyping) {
        socket.emit('typing', { to: selectedUser, from: currentUser });
      } else {
        socket.emit('stopTyping', { to: selectedUser, from: currentUser });
      }
    }
  };

  // ==============================
  // Vista del formulario de registro
  // ==============================
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

  // ==============================
  // Vista principal del chat
  // ==============================
  return (
    <div className="chat-container">
      {/* Botón para mostrar/ocultar lista en móviles */}
      <button
        className="toggle-users-btn"
        onClick={() => setShowUserList(!showUserList)}
      >
        {showUserList ? 'Ocultar usuarios' : 'Mostrar usuarios'}
      </button>

      {/* Lista de usuarios conectados */}
      {showUserList && (
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
      )}

      {/* Área de conversación */}
      <div className="chat-area">
        {selectedUser ? (
          <>
            {/* Encabezado del chat */}
            <div className="chat-header">
              <h3>Chat con {selectedUser}</h3>
              {typingUser && (
                <div className="typing-indicator">
                  {typingUser} está escribiendo...
                </div>
              )}
            </div>

            {/* Lista de mensajes */}
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

            {/* Caja para escribir y enviar mensaje */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              disabled={!selectedUser}
            />
          </>
        ) : (
          // Mensaje cuando no hay un chat seleccionado
          <div className="select-user-prompt">
            <p>Selecciona un usuario para comenzar a chatear</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
