import React, { useState } from 'react';
import { FileText, Upload, CheckCircle, Clock } from 'lucide-react';

const AssignmentCard = ({ message, isMe, userRole }) => {
  const { title, description, dueDate } = message.assignmentDetails || {};
  const [status, setStatus] = useState('Pending');

  const dateObj = new Date(dueDate || Date.now());
  const dateString = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleUpload = () => {
    // Mock upload action
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = () => {
      if (input.files.length > 0) {
        setStatus('Submitted');
      }
    };
    input.click();
  };

  return (
    <div className={`mt-1 mb-2 rounded-xl border ${isMe ? 'bg-[#ccebc6] border-[#b0dfa3]' : 'bg-purple-50 border-purple-100'} p-3 sm:p-4 min-w-[260px] max-w-[320px] shadow-sm`}>
      <div className="flex items-start gap-3 mb-2">
        <div className={`p-2.5 rounded-xl ${isMe ? 'bg-green-500 text-white' : 'bg-purple-500 text-white'} shadow-sm flex-shrink-0`}>
          <FileText size={20} />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 text-sm leading-tight">{title || 'New Assignment'}</h4>
          <div className="flex items-center gap-1 text-[11px] font-medium text-red-500 mt-1">
            <Clock size={12} />
            <span>Due: {dateString}</span>
          </div>
        </div>
      </div>
      
      {description && (
        <p className="text-xs text-gray-700 mb-4 line-clamp-3 bg-white/40 p-2 rounded-lg">
          {description}
        </p>
      )}
      
      <div className="border-t border-black/10 pt-3 mt-2">
        {userRole === 'teacher' ? (
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-600">0/1 Submitted</span>
            <button className="text-xs font-bold text-purple-700 bg-purple-200/50 hover:bg-purple-200 px-3 py-1.5 rounded-full transition-colors">
              View All
            </button>
          </div>
        ) : (
          <div>
            {status === 'Pending' ? (
              <button 
                onClick={handleUpload}
                className="w-full py-2 px-4 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 transition-all shadow-sm"
              >
                <Upload size={16} className="text-gray-500" />
                <span>Upload Work</span>
              </button>
            ) : (
              <div className="w-full py-2 px-4 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center gap-2 text-sm font-semibold text-green-700">
                <CheckCircle size={16} />
                <span>Submitted</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentCard;
