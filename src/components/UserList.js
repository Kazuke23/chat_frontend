const UserList = ({ users, currentUser, selectedUser, onSelectUser, unreadCounts }) => {
  return (
    <div className="users-list">
      <h3>Usuarios conectados ({users.length})</h3>
      {users.length > 0 ? (
        <ul>
          {users.map(user => (
            <li 
              key={user.id}
              className={selectedUser === user.username ? 'selected' : ''}
              onClick={() => onSelectUser(user)}
            >
              <div className="user-list-item">
                <span>{user.username}</span>
                {unreadCounts[user.username] > 0 && (
                  <span className="unread-badge">
                    {unreadCounts[user.username]}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-users">No hay otros usuarios conectados</p>
      )}
    </div>
  );
};
export default UserList;