import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Image as ImageIcon, FileText, Video, Calendar, X, StopCircle } from 'lucide-react';

const ChatInput = ({ onSendMessage, userRole }) => {
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const menuRef = useRef(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const [activeModal, setActiveModal] = useState(null); // 'assignment', 'live_class'
  const [modalData, setModalData] = useState({});

  const fileInputRef = useRef(null);
  const [fileType, setFileType] = useState(''); // 'image', 'document', 'video'

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage({ type: 'text', text: text.trim() });
      setText('');
    }
  };

  // Base64 File Reader
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      let msgType = 'document';
      if (file.type.startsWith('image/')) msgType = 'image';
      else if (file.type.startsWith('video/')) msgType = 'video';
      else if (file.type.startsWith('audio/')) msgType = 'audio';

      onSendMessage({
        type: msgType,
        mediaUrl: base64String,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset
  };

  const triggerFileInput = (type, accept) => {
    setFileType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      if (type === 'camera') {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const handleAttachClick = (type) => {
    setShowAttachMenu(false);
    if (type === 'assignment' || type === 'live_class') {
      setActiveModal(type);
      setModalData(type === 'live_class' ? { duration: 60 } : {});
    } else if (type === 'gallery') {
      triggerFileInput('gallery', 'image/*,video/*');
    } else if (type === 'camera') {
      triggerFileInput('camera', 'image/*,video/*');
    } else if (type === 'document') {
      triggerFileInput('document', '.pdf,.doc,.docx,.txt');
    }
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    const generateMeetLink = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const randomStr = (length) => Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      return `https://meet.google.com/${randomStr(3)}-${randomStr(4)}-${randomStr(3)}`;
    };

    if (activeModal === 'assignment') {
      onSendMessage({
        type: 'assignment',
        assignmentDetails: {
          title: modalData.title,
          description: modalData.description,
          dueDate: modalData.dueDate || new Date(Date.now() + 86400000).toISOString(),
        }
      });
    } else if (activeModal === 'live_class') {
      onSendMessage({
        type: 'live_class',
        classDetails: {
          topic: modalData.topic,
          scheduledTime: modalData.scheduledTime || new Date(Date.now() + 3600000).toISOString(),
          duration: modalData.duration || 60,
          meetLink: generateMeetLink()
        }
      });
    }
    setActiveModal(null);
    setModalData({});
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          onSendMessage({
            type: 'audio',
            mediaUrl: reader.result, // base64
            duration: recordingTime
          });
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const attachOptions = [
    { id: 'document', icon: <FileText size={20} />, label: 'Document', color: 'bg-purple-500' },
    { id: 'camera', icon: <Video size={20} />, label: 'Camera', color: 'bg-pink-500' },
    { id: 'gallery', icon: <ImageIcon size={20} />, label: 'Gallery', color: 'bg-blue-500' },
  ];

  if (userRole === 'teacher') {
    attachOptions.unshift(
      { id: 'assignment', icon: <FileText size={20} />, label: 'Assignment', color: 'bg-orange-500' },
      { id: 'live_class', icon: <Calendar size={20} />, label: 'Live Class', color: 'bg-green-500' }
    );
  }

  return (
    <div className="bg-[#efeae2] px-2 sm:px-4 py-3 flex items-end gap-2 shrink-0 z-10 w-full relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Attachment Menu */}
      <AnimatePresence>
        {showAttachMenu && (
          <motion.div 
            ref={menuRef}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="absolute bottom-[60px] left-4 bg-white rounded-2xl shadow-xl p-4 w-[280px] grid grid-cols-3 gap-y-4 gap-x-2 z-50"
          >
            {attachOptions.map(opt => (
              <div 
                key={opt.id} 
                onClick={() => handleAttachClick(opt.id)}
                className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
              >
                <div className={`${opt.color} p-3.5 rounded-full text-white shadow-md`}>
                  {opt.icon}
                </div>
                <span className="text-xs text-gray-700 font-medium text-center">{opt.label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals for Assignment / Live Class */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex justify-center items-center bg-black/50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {activeModal === 'assignment' ? 'Create Assignment' : 'Schedule Live Class'}
              </h2>
              
              <form onSubmit={handleModalSubmit} className="space-y-4">
                {activeModal === 'assignment' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input required type="text" value={modalData.title || ''} onChange={e => setModalData({...modalData, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea required value={modalData.description || ''} onChange={e => setModalData({...modalData, description: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none h-24 resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input required type="datetime-local" onChange={e => setModalData({...modalData, dueDate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                      <input required type="text" value={modalData.topic || ''} onChange={e => setModalData({...modalData, topic: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time</label>
                      <input required type="datetime-local" onChange={e => setModalData({...modalData, scheduledTime: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                      <input required type="number" min="15" value={modalData.duration || 60} onChange={e => setModalData({...modalData, duration: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                  </>
                )}
                
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors mt-2">
                  Send to Chat
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex flex-1 items-end gap-2">
        {isRecording ? (
          <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-red-500 font-medium">
              <motion.div 
                animate={{ opacity: [1, 0, 1] }} 
                transition={{ repeat: Infinity, duration: 1 }} 
                className="w-2.5 h-2.5 bg-red-500 rounded-full"
              />
              <span className="text-sm">{formatTime(recordingTime)}</span>
            </div>
            <span className="text-xs text-gray-400">Recording audio...</span>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-2xl sm:rounded-full px-2 sm:px-4 py-1.5 sm:py-2.5 flex items-end shadow-sm">
            <button 
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors shrink-0 mb-0.5"
            >
              <Paperclip size={22} className="transform -rotate-45" />
            </button>
            
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Type a message"
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 px-2 py-1.5 text-sm sm:text-[15px] outline-none"
              rows={1}
              style={{ minHeight: '40px' }}
            />
          </div>
        )}
        
        {text.trim() ? (
          <button 
            type="submit" 
            className="bg-[#00a884] hover:bg-[#008f6f] text-white p-3 sm:p-3.5 rounded-full transition-colors shrink-0 shadow-sm mb-0.5"
          >
            <Send size={20} className="ml-0.5" />
          </button>
        ) : isRecording ? (
           <button 
            type="button"
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white p-3 sm:p-3.5 rounded-full transition-colors shrink-0 shadow-sm mb-0.5"
          >
            <StopCircle size={20} />
          </button>
        ) : (
          <button 
            type="button" 
            onClick={startRecording}
            className="bg-[#00a884] hover:bg-[#008f6f] text-white p-3 sm:p-3.5 rounded-full transition-colors shrink-0 shadow-sm mb-0.5"
          >
            <Mic size={20} />
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatInput;
