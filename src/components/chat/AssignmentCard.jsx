import React, { useState, useMemo } from 'react';
import { FileText, Upload, CheckCircle, Clock, X, Download } from 'lucide-react';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const AssignmentCard = ({ message, isMe, userRole }) => {
  const { title, description, dueDate } = message.assignmentDetails || {};
  const [status, setStatus] = useState('Pending');
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  const dateString = useMemo(() => {
    const dateObj = new Date(dueDate || Date.now());
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [dueDate]);

  const submissions = message.submissions || [];

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = async () => {
      if (input.files.length > 0) {
        const file = input.files[0];
        setStatus('Uploading...');

        try {
          // 1. Upload to Firebase Storage
          const storagePath = `assignments/${message.id}/${user.id}_${Date.now()}_${file.name}`;
          const storageRef = ref(storage, storagePath);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          let extractedText = '';
          
          // 2. Optional AI text extraction (using base64 only for the API call if needed)
          if (file.type.startsWith('image/')) {
            try {
              setStatus('Extracting Text (AI)...');
              const reader = new FileReader();
              const base64Promise = new Promise((resolve) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
              });
              const base64String = await base64Promise;

              const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
              if (apiKey) {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{
                      parts: [
                        { text: "Extract all text from this image. Output only the extracted text with no markdown formatting." },
                        {
                          inlineData: {
                            mimeType: file.type,
                            data: base64String.split(',')[1]
                          }
                        }
                      ]
                    }]
                  })
                });
                const data = await response.json();
                extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              }
            } catch (err) {
              console.error('Error extracting text with Gemini:', err);
            }
          }
          
          setStatus('Submitted');
          
          const newSubmission = {
            studentId: user?.id || 'unknown',
            studentName: user?.name || 'Student',
            fileName: file.name,
            fileSize: file.size,
            fileUrl: downloadURL, // Store the Cloud URL instead of base64
            extractedText: extractedText,
            submittedAt: new Date().toISOString()
          };

          if (message.id) {
            // Update Firestore only
            const msgRef = doc(db, 'messages', message.id);
            await setDoc(msgRef, {
              submissions: arrayUnion(newSubmission)
            }, { merge: true });
          }
        } catch (e) {
          console.error("Error uploading to Firebase Storage", e);
          setStatus('Upload Failed');
          alert("Failed to upload file. Please check your connection.");
        }
      }
    };
    input.click();
  };

  const handleDownload = (e, sub) => {
    e.preventDefault();
    if (sub.fileUrl) {
      window.open(sub.fileUrl, '_blank');
    } else if (sub.fileData) {
      // Compatibility for older Base64 submissions
      const arr = sub.fileData.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sub.fileName || 'submission';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  const handleDownloadText = (e, sub) => {
    e.preventDefault();
    if (!sub.extractedText) return;
    const blob = new Blob([sub.extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sub.fileName.split('.')[0]}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isSubmitted = status === 'Submitted' || submissions.some(s => s.studentId === user?.id);

  return (
    <>
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
              <span className="text-xs font-semibold text-gray-600">{submissions.length} Submitted</span>
              <button 
                onClick={() => setShowModal(true)}
                className="text-xs font-bold text-purple-700 bg-purple-200/50 hover:bg-purple-200 px-3 py-1.5 rounded-full transition-colors"
              >
                View All
              </button>
            </div>
          ) : (
            <div>
              {!isSubmitted ? (
                <button 
                  onClick={handleUpload}
                  disabled={status !== 'Pending' && status !== 'Upload Failed'}
                  className="w-full py-2 px-4 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 transition-all shadow-sm disabled:opacity-50"
                >
                  <Upload size={16} className="text-gray-500" />
                  <span>{status === 'Pending' || status === 'Upload Failed' ? 'Upload Work' : status}</span>
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

      {/* Submissions Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg text-gray-900">Student Submissions</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800 transition-colors p-1 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {submissions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText size={28} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No submissions yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Files submitted by students will appear here.</p>
                </div>
              ) : (
                submissions.map((sub, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl mb-3 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="bg-purple-100 p-2.5 rounded-lg text-purple-600 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-bold text-gray-900 truncate">{sub.studentName}</p>
                        <p className="text-xs text-gray-500 truncate">{sub.fileName}</p>
                        <p className="text-[10px] text-gray-400 uppercase mt-0.5">
                          {sub.fileSize ? (sub.fileSize / 1024 / 1024).toFixed(2) : '0.00'} MB • {new Date(sub.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {sub.extractedText && (
                        <button 
                          onClick={(e) => handleDownloadText(e, sub)}
                          className="text-orange-600 hover:bg-orange-200 bg-orange-100 p-2 rounded-full transition-colors shrink-0 flex items-center justify-center"
                          title="Download Extracted Text (AI)"
                        >
                          <FileText size={18} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => handleDownload(e, sub)}
                        className="text-purple-600 hover:bg-purple-200 bg-purple-100 p-2 rounded-full transition-colors shrink-0 flex items-center justify-center"
                        title="Download Original Submission"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AssignmentCard;
