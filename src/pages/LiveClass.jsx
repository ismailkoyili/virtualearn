import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, Monitor, PenTool, VideoOff, Video as VideoIcon, Users } from 'lucide-react';

// Components
import Whiteboard from '../components/live-class/Whiteboard';
import LiveChat from '../components/live-class/LiveChat';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const LiveClass = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('whiteboard'); // 'whiteboard', 'screen', or 'video'
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoSharing, setIsVideoSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('waiting');
  const [roomId, setRoomId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.role === 'teacher') {
      setRoomId(user.id);
    } else if (user.role === 'student' && user.assignedTeacherId) {
      setRoomId(user.assignedTeacherId);
    } else {
      setRoomId(user.id);
    }
  }, [user, navigate]);

  // Teacher Presence Sync
  useEffect(() => {
    if (!roomId || !user) return;
    
    const roomRef = doc(db, 'liveRooms', roomId);
    if (user.role === 'teacher') {
      setDoc(roomRef, { isLive: true }, { merge: true });
      setIsLive(true);
      
      const handleUnload = () => {
        updateDoc(roomRef, { isLive: false, activeStream: null, offer: null, answer: null });
      };
      
      window.addEventListener('beforeunload', handleUnload);
      return () => {
        updateDoc(roomRef, { isLive: false, activeStream: null, offer: null, answer: null });
        window.removeEventListener('beforeunload', handleUnload);
      };
    } else {
      const unsub = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsLive(!!data.isLive);
          if (data.activeStream) {
            setActiveTab(data.activeStream);
            if (data.activeStream === 'screen') {
               setIsScreenSharing(true);
               setIsVideoSharing(false);
            } else if (data.activeStream === 'video') {
               setIsVideoSharing(true);
               setIsScreenSharing(false);
            }
          } else {
            setIsScreenSharing(false);
            setIsVideoSharing(false);
            setActiveTab('whiteboard');
          }
        } else {
          setIsLive(false);
        }
      });
      return () => unsub();
    }
  }, [roomId, user]);

  // Handle WebRTC Setup based on Role
  useEffect(() => {
    if (!roomId || !user) return;
    
    peerConnection.current = new RTCPeerConnection(configuration);

    peerConnection.current.addEventListener('iceconnectionstatechange', () => {
      console.log('ICE state:', peerConnection.current?.iceConnectionState);
      if (peerConnection.current?.iceConnectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (peerConnection.current?.iceConnectionState === 'disconnected' || peerConnection.current?.iceConnectionState === 'failed') {
        setConnectionStatus('waiting');
      }
    });

    if (user.role === 'student') {
      peerConnection.current.addEventListener('track', async (event) => {
        console.log('Got remote track:', event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      });
      
      joinRoomById(roomId);
    }

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, user]);

  const clearCandidates = async () => {
    if (!roomId) return;
    const roomRef = doc(db, 'liveRooms', roomId);
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
    
    const callerSnap = await getDocs(callerCandidatesCollection);
    callerSnap.forEach(d => deleteDoc(d.ref));
    
    const calleeSnap = await getDocs(calleeCandidatesCollection);
    calleeSnap.forEach(d => deleteDoc(d.ref));
  };

  const stopMediaShare = async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach(sender => {
        peerConnection.current.removeTrack(sender);
      });
    }
    
    setIsScreenSharing(false);
    setIsVideoSharing(false);
    setActiveTab('whiteboard');
    
    if (roomId && user?.role === 'teacher') {
      const roomRef = doc(db, 'liveRooms', roomId);
      await updateDoc(roomRef, { offer: null, answer: null, activeStream: null });
      await clearCandidates();
    }
  };

  const startScreenShare = async () => {
    try {
      await stopMediaShare(); // stop any existing
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      localStream.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });
      
      stream.getVideoTracks()[0].onended = () => {
        stopMediaShare();
      };
      
      setIsScreenSharing(true);
      setActiveTab('screen');
      createRoom('screen');
      
    } catch (error) {
      console.error("Error accessing display media.", error);
      if (error.name !== 'NotAllowedError') {
         alert("Could not start screen share. Please ensure you granted permissions.");
      }
    }
  };

  const startVideoShare = async () => {
    try {
      await stopMediaShare(); // stop any existing
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });
      
      stream.getVideoTracks()[0].onended = () => {
        stopMediaShare();
      };
      
      setIsVideoSharing(true);
      setActiveTab('video');
      createRoom('video');
      
    } catch (error) {
      console.error("Error accessing camera media.", error);
      alert("Could not start video share. Please ensure you granted camera permissions.");
    }
  };

  // WebRTC Signaling: Create Offer (Teacher)
  const createRoom = async (streamType) => {
    if (!roomId) return;
    setConnectionStatus('connecting');
    const roomRef = doc(db, 'liveRooms', roomId);
    
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

    peerConnection.current.onicecandidate = event => {
      if (!event.candidate) {
        console.log('Got final candidate!');
        return;
      }
      addDoc(callerCandidatesCollection, event.candidate.toJSON());
    };

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    const roomWithOffer = {
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
      activeStream: streamType
    };
    await setDoc(roomRef, roomWithOffer, { merge: true });

    // Listen for remote answer
    onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data();
      if (peerConnection.current && !peerConnection.current.currentRemoteDescription && data && data.answer) {
        console.log('Got remote description: ', data.answer);
        try {
          const rtcSessionDescription = new RTCSessionDescription(data.answer);
          await peerConnection.current.setRemoteDescription(rtcSessionDescription);
        } catch (e) {
          console.error("Error setting remote description:", e);
        }
      }
    });

    // Listen for remote ICE candidates
    onSnapshot(calleeCandidatesCollection, snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          let data = change.doc.data();
          if (peerConnection.current && peerConnection.current.remoteDescription) {
             try {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(data));
             } catch (e) {}
          }
        }
      });
    });
  };

  // WebRTC Signaling: Join Room (Student)
  const joinRoomById = async (roomId) => {
    setConnectionStatus('connecting');
    const roomRef = doc(db, 'liveRooms', roomId);
    
    onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data();
      if (data && data.offer) {
        console.log('Got offer:', data.offer);
        // Ensure signaling state allows setting remote description
        if (peerConnection.current && (peerConnection.current.signalingState === "stable" || peerConnection.current.signalingState === "have-local-offer")) {
            const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
            const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

            peerConnection.current.onicecandidate = event => {
              if (!event.candidate) {
                  return;
              }
              addDoc(calleeCandidatesCollection, event.candidate.toJSON());
            };

            try {
              await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await peerConnection.current.createAnswer();
              await peerConnection.current.setLocalDescription(answer);

              const roomWithAnswer = {
                answer: {
                    type: answer.type,
                    sdp: answer.sdp,
                },
              };
              await updateDoc(roomRef, roomWithAnswer);

              onSnapshot(callerCandidatesCollection, snapshot => {
                snapshot.docChanges().forEach(async change => {
                    if (change.type === 'added') {
                      let data = change.doc.data();
                      if (peerConnection.current && peerConnection.current.remoteDescription) {
                         try {
                            await peerConnection.current.addIceCandidate(new RTCIceCandidate(data));
                         } catch (e) {}
                      }
                    }
                });
              });
            } catch (e) {
               console.error("Error handling offer:", e);
            }
        }
      } else {
        setConnectionStatus('waiting');
      }
    });
  };

  if (!user) return null;

  // Render Waiting Screen for students if not live
  if (user.role === 'student' && !isLive) {
    return (
      <div className="h-screen bg-[#f0f2f5] flex flex-col items-center justify-center font-sans p-6 text-center">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full flex flex-col items-center border border-gray-100">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
             <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Class Not Started</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Please wait for your teacher to start the live class session. You will be automatically connected when the class begins.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors shadow-md"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f0f2f5] flex flex-col font-sans overflow-hidden">
      {/* Top Navigation */}
      <nav className="bg-gray-900 px-4 py-3 shadow-lg shrink-0 text-white flex items-center justify-between h-[60px] sm:h-[70px] z-20">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(user?.role === 'teacher' ? '/teacher-dashboard' : '/dashboard')}
            className="flex items-center text-gray-300 hover:text-white transition-colors mr-4 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg font-medium text-sm"
          >
            <ArrowLeft size={18} className="mr-1.5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-3 border-l border-gray-700 pl-4">
            <span className="bg-red-500 w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            <span className="font-bold text-lg hidden sm:block tracking-tight">VirtuLearn Live</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {user.role === 'teacher' && (
            <>
              <button
                onClick={isVideoSharing ? stopMediaShare : startVideoShare}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                  isVideoSharing 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isVideoSharing ? <VideoOff size={18} /> : <VideoIcon size={18} />}
                <span className="hidden sm:block">{isVideoSharing ? 'Stop Video' : 'Share Video'}</span>
              </button>

              <button
                onClick={isScreenSharing ? stopMediaShare : startScreenShare}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                  isScreenSharing 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isScreenSharing ? <VideoOff size={18} /> : <Monitor size={18} />}
                <span className="hidden sm:block">{isScreenSharing ? 'Stop Screen' : 'Share Screen'}</span>
              </button>
            </>
          )}
          
          <div className="bg-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm text-gray-300 border border-gray-700">
            <Users size={16} />
            <span>{connectionStatus === 'connected' ? 'Connected' : 'Waiting...'}</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Presentation Area */}
        <div className="flex-1 flex flex-col bg-gray-800 relative z-10 p-2 md:p-4 transition-all">
          
          {/* Tabs for switching between Screen and Whiteboard */}
          <div className="flex items-center gap-2 mb-3 px-2">
            <button 
              onClick={() => user.role === 'teacher' && setActiveTab('whiteboard')}
              disabled={user.role !== 'teacher'}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                activeTab === 'whiteboard' ? 'bg-white text-gray-900 border-blue-500' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'
              } ${user.role !== 'teacher' && 'cursor-default'}`}
            >
              <PenTool size={16} />
              Whiteboard
            </button>
            
            {(activeTab === 'screen' || isScreenSharing) && (
              <button 
                onClick={() => user.role === 'teacher' && setActiveTab('screen')}
                disabled={user.role !== 'teacher'}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === 'screen' ? 'bg-white text-gray-900 border-blue-500' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'
                } ${user.role !== 'teacher' && 'cursor-default'}`}
              >
                <Monitor size={16} />
                Screen Share {isScreenSharing && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1"></span>}
              </button>
            )}

            {(activeTab === 'video' || isVideoSharing) && (
              <button 
                onClick={() => user.role === 'teacher' && setActiveTab('video')}
                disabled={user.role !== 'teacher'}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === 'video' ? 'bg-white text-gray-900 border-blue-500' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'
                } ${user.role !== 'teacher' && 'cursor-default'}`}
              >
                <VideoIcon size={16} />
                Video {isVideoSharing && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1"></span>}
              </button>
            )}
          </div>

          {/* Content Container */}
          <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative">
            
            {/* Whiteboard Layer */}
            <div className={`absolute inset-0 z-20 ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}>
              <Whiteboard roomId={roomId} userRole={user.role} />
            </div>

            {/* Media (Screen/Video) Layer */}
            <div className={`absolute inset-0 z-10 bg-gray-900 flex items-center justify-center ${activeTab === 'screen' || activeTab === 'video' ? 'block' : 'hidden'}`}>
              {!(isScreenSharing || isVideoSharing) ? (
                <div className="flex flex-col items-center justify-center text-gray-500 gap-4">
                  <Monitor size={48} className="opacity-20" />
                  <p className="font-medium text-lg">No active media share.</p>
                </div>
              ) : (
                <video 
                  ref={user.role === 'teacher' ? localVideoRef : remoteVideoRef}
                  autoPlay 
                  playsInline 
                  muted={user.role === 'teacher'} // Mute local echo
                  className="w-full h-full object-contain bg-black"
                />
              )}
            </div>
            
          </div>
          
          {user.role === 'teacher' && connectionStatus !== 'connected' && (isScreenSharing || isVideoSharing) && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-md border border-gray-700 text-gray-300 px-4 py-2 rounded-full text-sm flex items-center gap-2 z-30">
               <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"></div>
               Waiting for student to join stream...
             </div>
          )}
        </div>

        {/* Right Side: Chat Area */}
        <div className="w-full md:w-[350px] lg:w-[400px] h-[40vh] md:h-full border-t md:border-t-0 md:border-l border-gray-200 bg-white z-20 flex flex-col shrink-0">
          <LiveChat roomId={roomId} user={user} />
        </div>
      </div>
    </div>
  );
};

export default LiveClass;
