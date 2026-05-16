import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowLeft, User as UserIcon, Search, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, onSnapshot, addDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const messagesEndRef = useRef(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch users
  useEffect(() => {
    if (!user) return;
    
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        const usersList = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.uid !== user.id) {
            usersList.push(data);
          }
        });
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, [user]);

  // Get Chat ID (alphabetically sorted user IDs)
  const getChatId = (user1, user2) => {
    return [user1, user2].sort().join('_');
  };

  // Fetch messages real-time
  useEffect(() => {
    if (!user || !selectedUser) return;

    const chatId = getChatId(user.id, selectedUser.uid);
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef, 
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
    }, (error) => {
      console.error("Error fetching messages:", error);
      // Fallback if index is missing: Fetch without orderBy, then sort manually
      if (error.code === 'failed-precondition') {
        const fallbackQuery = query(messagesRef, where('chatId', '==', chatId));
        onSnapshot(fallbackQuery, (fbSnapshot) => {
          const msgs = [];
          fbSnapshot.forEach((doc) => {
            msgs.push({ id: doc.id, ...doc.data() });
          });
          // Sort manually by timestamp
          msgs.sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
            return timeA - timeB;
          });
          setMessages(msgs);
        });
      }
    });

    return () => unsubscribe();
  }, [user, selectedUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !user) return;

    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      const chatId = getChatId(user.id, selectedUser.uid);
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: user.id,
        receiverId: selectedUser.uid,
        text: textToSend,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!user) return null;

  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex items-center">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors mr-4"
          >
            <ArrowLeft size={20} className="mr-1" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
            <img src="/logo.png" alt="VirtuLearn" className="h-6 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x30/0b3b60/ffffff?text=VirtuLearn" }} />
            <span className="font-bold text-lg text-gray-800 ml-2 hidden sm:block">Student Chat</span>
          </div>
        </div>
      </nav>

      {/* Main Chat Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex overflow-hidden">
        <div className="flex w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full">
          
          {/* Left Sidebar - Contacts list */}
          <div className={`w-full sm:w-1/3 md:w-80 border-r border-gray-200 flex flex-col ${selectedUser ? 'hidden sm:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Contacts</h2>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {searchTerm ? "No students found." : "No other students registered yet."}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredUsers.map((contact) => (
                    <li 
                      key={contact.uid}
                      onClick={() => setSelectedUser(contact)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 ${selectedUser?.uid === contact.uid ? 'bg-blue-50' : ''}`}
                    >
                      <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-2.5 rounded-full text-blue-600 flex-shrink-0">
                        <UserIcon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{contact.name}</p>
                        <p className="text-sm text-gray-500 truncate">Student</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Area - Chat View */}
          <div className={`flex-1 flex flex-col bg-[#efeae2] relative ${!selectedUser ? 'hidden sm:flex items-center justify-center' : 'flex'}`}>
            
            {!selectedUser ? (
              <div className="text-center text-gray-500">
                <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
                  <MessageSquare size={48} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-medium text-gray-700">Your Messages</h3>
                <p className="mt-2 text-sm text-gray-500">Select a student from the sidebar to start chatting.</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center shadow-sm shrink-0 z-10">
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="mr-3 sm:hidden text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-2 rounded-full text-blue-600 mr-3">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedUser.name}</h3>
                    <p className="text-xs text-green-500">Available</p>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-8 p-4 bg-white/50 rounded-xl inline-block mx-auto">
                      No messages here yet... Send a message to start the conversation!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={msg.id} 
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                              isMe 
                                ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-none' 
                                : 'bg-white text-gray-900 rounded-tl-none'
                            }`}
                          >
                            <p className="text-sm">{msg.text}</p>
                            <div className={`text-[10px] text-gray-500 mt-1 text-right`}>
                              {msg.timestamp ? new Date(msg.timestamp.toDate ? msg.timestamp.toDate() : msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="bg-gray-50 px-4 py-3 flex items-end gap-2 shrink-0 z-10">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message"
                    className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2.5 rounded-full transition-colors flex-shrink-0 shadow-sm"
                  >
                    <Send size={18} className="ml-0.5" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
