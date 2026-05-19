import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, FileText, Download } from 'lucide-react';
import LiveClassCard from './LiveClassCard';
import AssignmentCard from './AssignmentCard';

const MessageBubble = ({ message, isMe, userRole }) => {
  const timeStr = useMemo(() => {
    return message.timestamp
      ? new Date(message.timestamp.toDate ? message.timestamp.toDate() : message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      : '...';
  }, [message.timestamp]);

  // Read status mock (since we don't have read tracking in the db yet)
  const isRead = useMemo(() => {
    return message.timestamp && Date.now() - new Date(message.timestamp.toDate ? message.timestamp.toDate() : message.timestamp).getTime() > 5000;
  }, [message.timestamp]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div 
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl shadow-sm ${
          isMe 
            ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-sm' 
            : 'bg-white text-gray-900 rounded-tl-sm'
        } ${message.type === 'image' || message.type === 'video' ? 'p-1' : 'px-3 sm:px-4 py-2'}`}
      >
        {/* Special Message Types */}
        {message.type === 'live_class' && (
          <LiveClassCard message={message} isMe={isMe} userRole={userRole} />
        )}
        
        {message.type === 'assignment' && (
          <AssignmentCard message={message} isMe={isMe} userRole={userRole} />
        )}

        {/* Media: Image */}
        {message.type === 'image' && message.mediaUrl && (
          <div className="relative rounded-xl overflow-hidden mb-1 bg-black/5">
            <img 
              src={message.mediaUrl} 
              alt="Uploaded content" 
              className="max-w-full max-h-[300px] object-cover rounded-xl"
            />
          </div>
        )}

        {/* Media: Video */}
        {message.type === 'video' && message.mediaUrl && (
          <div className="relative rounded-xl overflow-hidden mb-1 bg-black/90">
            <video 
              src={message.mediaUrl} 
              controls
              className="max-w-full max-h-[300px] object-contain rounded-xl"
            />
          </div>
        )}

        {/* Media: Audio */}
        {message.type === 'audio' && message.mediaUrl && (
          <div className="flex items-center gap-3 w-64 my-1 bg-black/5 p-2 rounded-xl">
            <audio 
              src={message.mediaUrl} 
              controls 
              className="h-10 w-full"
            />
          </div>
        )}

        {/* Media: Document */}
        {message.type === 'document' && message.mediaUrl && (
          <div className={`flex items-center justify-between p-3 rounded-xl mb-1 mt-1 ${isMe ? 'bg-black/5' : 'bg-gray-100'} min-w-[200px]`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`p-2.5 rounded-lg ${isMe ? 'bg-green-500' : 'bg-purple-500'} text-white shrink-0`}>
                <FileText size={24} />
              </div>
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-sm font-semibold truncate">{message.fileName || 'Document'}</p>
                <p className="text-[11px] text-gray-500 uppercase">
                  {message.mimeType?.split('/')[1] || 'FILE'} • {(message.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <a 
              href={message.mediaUrl} 
              download={message.fileName || 'download'}
              className="p-2 text-gray-500 hover:text-gray-800 transition-colors shrink-0"
              title="Download"
            >
              <Download size={20} />
            </a>
          </div>
        )}

        {/* Regular Text Content */}
        {message.text && (
          <p className={`text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words pr-2 ${message.type === 'image' || message.type === 'video' ? 'px-2 pb-1' : ''}`}>
            {message.text}
          </p>
        )}

        {/* Footer (Time + Ticks) */}
        <div className={`flex items-center justify-end gap-1 mt-1 ${message.type !== 'text' && !message.text ? '-mt-1' : ''} ${message.type === 'image' || message.type === 'video' ? 'px-2 pb-1' : ''}`}>
          <span className="text-[10px] sm:text-xs text-gray-500 select-none">{timeStr}</span>
          {isMe && (
            <span className={isRead ? "text-blue-500" : "text-gray-400"}>
              {isRead ? <CheckCheck size={14} /> : <Check size={14} />}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
