import React, { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSendMessage, onTyping, disabled }) => {
  const [message, setMessage] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeout = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      onTyping(false);
      setIsUserTyping(false);
      clearTimeout(typingTimeout.current);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    if (!isUserTyping && e.target.value) {
      onTyping(true);
      setIsUserTyping(true);
    } else if (isUserTyping && !e.target.value) {
      onTyping(false);
      setIsUserTyping(false);
    }

    // Reset typing indicator after 3 seconds of inactivity
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (isUserTyping) {
        onTyping(false);
        setIsUserTyping(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeout.current);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="message-form">
      <input
        type="text"
        value={message}
        onChange={handleChange}
        placeholder={disabled ? "Selecciona un usuario para chatear" : "Escribe un mensaje..."}
        disabled={disabled}
      />
      <button type="submit" disabled={!message.trim() || disabled}>
        Enviar
      </button>
    </form>
  );
};

export default MessageInput;