import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User as UserIcon, MoreVertical, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, onSnapshot, setDoc, doc, serverTimestamp, orderBy, where } from 'firebase/firestore';

// Subcomponents
import ChatSidebar from '../components/chat/ChatSidebar';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 640);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);

        const usersList = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.uid !== user.id && data.status !== 'pending') {
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

  const getChatId = (user1, user2) => {
    return [user1, user2].sort().join('_');
  };

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
    });

    return () => unsubscribe();
  }, [user, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (msgData) => {
    if (!selectedUser || !user) return;

    const chatId = getChatId(user.id, selectedUser.uid);
    const localId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const messagePayload = {
      chatId,
      senderId: user.id,
      receiverId: selectedUser.uid,
      timestamp: serverTimestamp(),
      ...msgData
    };

    try {
      await setDoc(doc(db, 'messages', localId), messagePayload);
    } catch (error) {
      console.error("Error sending message to Firebase:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen bg-[#efeae2] flex flex-col font-sans overflow-hidden">
      {/* Top Navbar */}
      <nav className="bg-[#00a884] px-4 py-3 shadow-md shrink-0 text-white flex items-center h-[60px] sm:h-[70px]">
        <div className="max-w-7xl mx-auto flex items-center w-full">
          <button 
            onClick={() => navigate(user?.role === 'teacher' ? '/teacher-dashboard' : '/dashboard')}
            className="flex items-center text-white/90 hover:text-white transition-colors mr-4 bg-black/10 hover:bg-black/20 px-3 py-1.5 rounded-lg font-medium text-sm"
          >
            <ArrowLeft size={18} className="mr-1.5" />
            <span>Dashboard</span>
          </button>
          <div className="flex items-center gap-2 border-l border-white/20 pl-4">
            <span className="font-bold text-lg hidden sm:block">
              {user?.role === 'teacher' ? 'VirtuLearn Teacher Portal' : 'VirtuLearn Student Portal'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Chat Container */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto sm:py-6 sm:px-6 lg:px-8 flex overflow-hidden">
        <div className="flex w-full bg-white sm:rounded-xl sm:shadow-lg border-none overflow-hidden h-full">
          
          <ChatSidebar 
            users={users}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            loadingUsers={loadingUsers}
            isMobileView={isMobileView}
          />

          {/* Right Area - Chat View */}
          <div className={`flex-1 flex flex-col bg-[#efeae2] relative ${!selectedUser && isMobileView ? 'hidden' : 'flex'} border-l border-gray-200 w-full`}>
            
            {!selectedUser ? (
              <div className="hidden sm:flex flex-col items-center justify-center h-full text-center text-gray-500 bg-[#f0f2f5] border-b-[6px] border-[#00a884]">
                <img src="/logo.png" alt="VirtuLearn" className="h-24 object-contain mb-8 opacity-40 grayscale" />
                <h3 className="text-3xl font-light text-gray-600 mb-4">VirtuLearn Web Chat</h3>
                <p className="mt-2 text-[15px] text-gray-500 max-w-md leading-relaxed">
                  Connect with your {user?.role === 'teacher' ? 'students' : 'teachers'} instantly.
                  Use VirtuLearn Chat for assignments, live classes, and seamless communication.
                </p>
                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 bg-gray-200/50 px-4 py-2 rounded-full">
                  <svg viewBox="0 0 10 12" width="10" height="12" className="" fill="currentColor"><path d="M5.008 1.456c-1.354 0-2.457 1.106-2.457 2.457v2.196c0 1.35 1.103 2.457 2.457 2.457s2.457-1.106 2.457-2.457V3.913c0-1.35-1.103-2.457-2.457-2.457zm-1.077 2.457c0-.594.484-1.077 1.077-1.077s1.077.484 1.077 1.077v2.196c0 .594-.484 1.077-1.077 1.077s-1.077-.484-1.077-1.077V3.913z" fillRule="evenodd"></path></svg>
                  <span>End-to-end encrypted</span>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="bg-[#f0f2f5] px-4 py-2 border-b border-gray-200 flex items-center justify-between shadow-sm shrink-0 h-[60px] sm:h-[72px] z-10">
                  <div className="flex items-center">
                    <button 
                      onClick={() => setSelectedUser(null)}
                      className="mr-3 sm:hidden text-gray-600 hover:text-gray-800 p-2"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-2 rounded-full text-blue-600 mr-4 h-10 w-10 flex items-center justify-center shadow-sm cursor-pointer">
                      <UserIcon size={20} />
                    </div>
                    <div className="cursor-pointer">
                      <h3 className="font-semibold text-gray-900 text-[16px]">{selectedUser.name}</h3>
                      <p className="text-xs text-gray-500">online</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-600">
                    <Search size={20} className="cursor-pointer hover:text-gray-800" />
                    <MoreVertical size={20} className="cursor-pointer hover:text-gray-800" />
                  </div>
                </div>

                {/* Messages Area */}
                <div 
                  className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col"
                  style={{
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                    backgroundRepeat: 'repeat',
                    backgroundSize: '400px'
                  }}
                >
                  <div className="bg-[#ffeecd] text-gray-700 text-xs text-center p-2 rounded-lg mx-auto mb-6 shadow-sm max-w-sm shrink-0 mt-2">
                    <p>Messages and calls are end-to-end encrypted. No one outside of this chat, not even VirtuLearn, can read or listen to them.</p>
                  </div>

                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-8 p-4 bg-white/80 rounded-xl inline-block mx-auto shadow-sm backdrop-blur-sm border border-gray-100 shrink-0">
                      No messages here yet. Send a message to start the conversation!
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        isMe={msg.senderId === user.id} 
                        userRole={user.role} 
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} className="shrink-0" />
                </div>

                {/* Input Area */}
                <ChatInput onSendMessage={handleSendMessage} userRole={user.role} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
