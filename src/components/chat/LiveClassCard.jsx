import React from 'react';
import { Video, Calendar, Clock, ChevronRight } from 'lucide-react';

const LiveClassCard = ({ message, isMe, userRole }) => {
  const { topic, scheduledTime, duration } = message.classDetails || {};
  
  // Format the date
  const dateObj = new Date(scheduledTime || Date.now());
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeString = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handleJoin = () => {
    const link = message.classDetails?.meetLink || 'https://meet.google.com/';
    window.open(link, '_blank');
  };

  return (
    <div className={`mt-1 mb-2 rounded-xl border ${isMe ? 'bg-[#ccebc6] border-[#b0dfa3]' : 'bg-blue-50 border-blue-100'} p-3 sm:p-4 min-w-[250px] shadow-sm`}>
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-black/10">
        <div className={`p-2.5 rounded-full ${isMe ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'} shadow-sm`}>
          <Video size={20} />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 text-sm">{topic || 'Live Class Session'}</h4>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Class</span>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar size={14} className="text-gray-500" />
          <span>{dateString}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock size={14} className="text-gray-500" />
          <span>{timeString} ({duration || 60} mins)</span>
        </div>
      </div>
      
      <button 
        className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
          isMe 
            ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' 
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
        }`}
        onClick={handleJoin}
      >
        <span>Join Live Class</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default LiveClassCard;
