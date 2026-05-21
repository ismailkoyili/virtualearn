import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Send, User as UserIcon } from 'lucide-react';

const LiveChat = ({ roomId, user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const messagesRef = collection(db, `liveRooms/${roomId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !roomId) return;

    const msgData = {
      text: newMessage.trim(),
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      timestamp: serverTimestamp()
    };
    
    setNewMessage('');

    try {
      const messagesRef = collection(db, `liveRooms/${roomId}/messages`);
      await addDoc(messagesRef, msgData);
    } catch (error) {
      console.error("Error sending live chat message:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-gray-800">Live Chat</h3>
        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#f8fafc]">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-gray-400 mt-10">
            No messages yet. Say hi!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="text-[10px] text-gray-500 mb-0.5 px-1 flex gap-1">
                  <span className="font-semibold">{isMe ? 'You' : msg.senderName}</span>
                  {msg.senderRole === 'teacher' && <span className="text-blue-500">(Teacher)</span>}
                </div>
                <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                  isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-gray-100 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-full transition-colors flex items-center justify-center h-9 w-9 shrink-0"
          >
            <Send size={16} className={newMessage.trim() ? 'ml-0.5' : ''} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveChat;
