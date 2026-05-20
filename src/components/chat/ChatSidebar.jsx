import React from 'react';
import { Search, User as UserIcon } from 'lucide-react';

const ChatSidebar = ({ 
  users, 
  lastMessages,
  getChatId,
  currentUser,
  selectedUser,
  setSelectedUser, 
  searchTerm, 
  setSearchTerm, 
  loadingUsers,
  isMobileView 
}) => {
  
  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < oneDay * 2) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className={`w-full sm:w-1/3 md:w-[350px] border-r border-gray-200 flex flex-col bg-white ${selectedUser && isMobileView ? 'hidden sm:flex' : 'flex'}`}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0 h-[72px]">
        <h2 className="text-xl font-bold text-gray-800">Chats</h2>
        <div className="bg-gray-200 p-2 rounded-full cursor-pointer hover:bg-gray-300 transition-colors">
          <svg viewBox="0 0 24 24" width="20" height="20" className="text-gray-600" fill="currentColor">
            <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path>
          </svg>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="p-2 border-b border-gray-200 shrink-0">
        <div className="relative bg-gray-100 rounded-lg flex items-center px-3 py-1.5">
          <Search size={18} className="text-gray-500 mr-3" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-sm focus:outline-none focus:ring-0 text-gray-700 placeholder-gray-500"
          />
        </div>
      </div>
      
      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loadingUsers ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {searchTerm ? "No users found." : "No other users registered yet."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredUsers.map((contact) => {
              const chatId = getChatId(currentUser.id, contact.uid);
              const lastMsg = lastMessages[chatId];

              return (
                <li
                  key={contact.uid}
                  onClick={() => setSelectedUser(contact)}
                  className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 hover:bg-[#f5f6f6] ${selectedUser?.uid === contact.uid ? 'bg-[#ebebeb]' : ''}`}
                >
                  <div className="relative">
                    <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-3 rounded-full text-blue-600 flex-shrink-0 h-12 w-12 flex items-center justify-center">
                      <UserIcon size={24} />
                    </div>
                    {/* Mock Online Indicator */}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="min-w-0 flex-1 border-b border-transparent">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <p className="font-semibold text-gray-900 truncate text-[17px]">{contact.name}</p>
                      <span className="text-xs text-gray-500 shrink-0">
                        {lastMsg ? formatLastMessageTime(lastMsg.timestamp) : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500 truncate">
                        {lastMsg ? (
                          <>
                            {lastMsg.senderId === currentUser.id && <span className="mr-1">You:</span>}
                            {lastMsg.text}
                          </>
                        ) : (
                          contact.role || 'Student'
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
