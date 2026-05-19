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

  // Handle window resize for responsive layout toggle
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch users with localStorage fallback
  useEffect(() => {
    if (!user) return;
    
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const fetchPromise = getDocs(usersRef);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
        
        let querySnapshot = null;
        try {
          querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);
        } catch (err) {
          console.warn('Chat: Firestore fetch timed out, falling back to localStorage.', err);
        }

        const usersListMap = new Map();

        if (querySnapshot) {
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.uid !== user.id && data.status !== 'pending') {
              usersListMap.set(data.uid, data);
            }
          });
        }

        // Merge with localStorage
        try {
          const localUsers = JSON.parse(localStorage.getItem('virtulearn_users') || '[]');
          localUsers.forEach((localUser) => {
            if (localUser.uid !== user.id && localUser.status !== 'pending' && !usersListMap.has(localUser.uid)) {
              usersListMap.set(localUser.uid, localUser);
            }
          });
        } catch (e) {
          console.warn("Could not read from localStorage:", e);
        }

        setUsers(Array.from(usersListMap.values()));
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, [user]);

  // Get Chat ID
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
      const msgsMap = new Map();
      snapshot.forEach((doc) => {
        msgsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // Merge with localStorage
      try {
        const localMsgs = JSON.parse(localStorage.getItem(`messages_${chatId}`) || '[]');
        localMsgs.forEach(msg => {
          if (!msgsMap.has(msg.id)) {
            msgsMap.set(msg.id, msg);
          } else {
            const existingMsg = msgsMap.get(msg.id);
            if (msg.submissions && msg.submissions.length > 0) {
              const mergedSubmissions = [...(existingMsg.submissions || [])];
              msg.submissions.forEach(sub => {
                if (!mergedSubmissions.find(s => s.studentId === sub.studentId && s.fileName === sub.fileName)) {
                  mergedSubmissions.push(sub);
                }
              });
              existingMsg.submissions = mergedSubmissions;
            }
          }
        });
      } catch (e) {
        console.warn('Could not read messages from localStorage', e);
      }

      const finalMsgs = Array.from(msgsMap.values()).sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.localTimestamp || 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.localTimestamp || 0);
        return timeA - timeB;
      });
      setMessages(finalMsgs);
    }, (error) => {
      console.error("Error fetching messages:", error);
      // Fallback if index is missing or offline
      if (error.code === 'failed-precondition' || error.code === 'unavailable') {
        const fallbackQuery = query(messagesRef, where('chatId', '==', chatId));
        onSnapshot(fallbackQuery, (fbSnapshot) => {
          const msgsMap = new Map();
          fbSnapshot.forEach((doc) => {
            msgsMap.set(doc.id, { id: doc.id, ...doc.data() });
          });

          // Merge with localStorage
          try {
            const localMsgs = JSON.parse(localStorage.getItem(`messages_${chatId}`) || '[]');
            localMsgs.forEach(msg => {
              if (!msgsMap.has(msg.id)) {
                msgsMap.set(msg.id, msg);
              } else {
                const existingMsg = msgsMap.get(msg.id);
                if (msg.submissions && msg.submissions.length > 0) {
                  const mergedSubmissions = [...(existingMsg.submissions || [])];
                  msg.submissions.forEach(sub => {
                    if (!mergedSubmissions.find(s => s.studentId === sub.studentId && s.fileName === sub.fileName)) {
                      mergedSubmissions.push(sub);
                    }
                  });
                  existingMsg.submissions = mergedSubmissions;
                }
              }
            });
          } catch (e) {}

          const finalMsgs = Array.from(msgsMap.values()).sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.localTimestamp || 0);
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.localTimestamp || 0);
            return timeA - timeB;
          });
          setMessages(finalMsgs);
        });
      }
    });

    return () => unsubscribe();
  }, [user, selectedUser]);

  // Auto-scroll to bottom
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
      localTimestamp: Date.now(),
      ...msgData
    };

    // 1. Save to LocalStorage immediately (for cross-session local testing)
    try {
      const localMsgs = JSON.parse(localStorage.getItem(`messages_${chatId}`) || '[]');
      localMsgs.push({ id: localId, ...messagePayload });
      localStorage.setItem(`messages_${chatId}`, JSON.stringify(localMsgs));
    } catch (e) {
      console.warn("Could not save message to localStorage", e);
    }

    // 2. Try saving to Firebase with the exact same ID
    try {
      await setDoc(doc(db, 'messages', localId), {
        ...messagePayload,
        timestamp: serverTimestamp() // Add Firebase timestamp
      });
    } catch (error) {
      console.error("Error sending message to Firebase:", error);
      console.log("Message was still saved locally.");
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

      {/* Main Chat Container - WhatsApp Style */}
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
                  Send and receive messages without keeping your phone online.<br/>
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

                {/* Messages Area - WhatsApp Pattern Background */}
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
