import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { ArrowLeft, Monitor, PenTool, VideoOff, Users } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('whiteboard'); // 'whiteboard' or 'screen'
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('waiting'); // waiting, connected, connecting
  const [roomId, setRoomId] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Room ID is based on the teacher. 
    // If current user is teacher, their ID is the room ID.
    // If student, their assignedTeacherId is the room ID.
    if (user.role === 'teacher') {
      setRoomId(user.id);
    } else if (user.role === 'student' && user.assignedTeacherId) {
      setRoomId(user.assignedTeacherId);
    } else {
      // Admins or unassigned students might need a fallback or error
      setRoomId(user.id);
    }
  }, [user, navigate]);

  // Handle WebRTC Setup based on Role
  useEffect(() => {
    if (!roomId || !user) return;
    
    // Create Peer Connection
    peerConnection.current = new RTCPeerConnection(configuration);

    peerConnection.current.addEventListener('iceconnectionstatechange', () => {
      console.log('ICE state:', peerConnection.current.iceConnectionState);
      if (peerConnection.current.iceConnectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (peerConnection.current.iceConnectionState === 'disconnected') {
        setConnectionStatus('waiting');
      }
    });

    if (user.role === 'student') {
      // Student receives remote track
      peerConnection.current.addEventListener('track', async (event) => {
        console.log('Got remote track:', event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setIsScreenSharing(true);
          setActiveTab('screen');
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

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      localStream.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });
      
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      setIsScreenSharing(true);
      setActiveTab('screen');
      
      // Teacher initiates the call
      createRoom();
      
    } catch (error) {
      console.error("Error accessing display media.", error);
      alert("Could not start screen share. Please ensure you granted permissions.");
    }
  };

  const stopScreenShare = async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    setIsScreenSharing(false);
    
    if (roomId) {
      const roomRef = doc(db, 'liveRooms', roomId);
      await updateDoc(roomRef, { offer: null, answer: null });
    }
  };

  // WebRTC Signaling: Create Offer (Teacher)
  const createRoom = async () => {
    if (!roomId) return;
    setConnectionStatus('connecting');
    const roomRef = doc(db, 'liveRooms', roomId);
    
    // Clear previous callers/callees
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

    peerConnection.current.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        console.log('Got final candidate!');
        return;
      }
      addDoc(callerCandidatesCollection, event.candidate.toJSON());
    });

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    const roomWithOffer = {
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
    };
    await setDoc(roomRef, roomWithOffer, { merge: true });

    // Listen for remote answer
    onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data();
      if (!peerConnection.current.currentRemoteDescription && data && data.answer) {
        console.log('Got remote description: ', data.answer);
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await peerConnection.current.setRemoteDescription(rtcSessionDescription);
      }
    });

    // Listen for remote ICE candidates
    onSnapshot(calleeCandidatesCollection, snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          let data = change.doc.data();
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data));
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
        if (peerConnection.current.signalingState === "stable" || peerConnection.current.signalingState === "have-local-offer") {
            const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
            const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

            peerConnection.current.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            addDoc(calleeCandidatesCollection, event.candidate.toJSON());
            });

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
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(data));
                }
            });
            });
        }
      } else {
        // No active offer
        setIsScreenSharing(false);
        setActiveTab('whiteboard');
        setConnectionStatus('waiting');
      }
    });
  };

  if (!user) return null;

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
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                isScreenSharing 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isScreenSharing ? <VideoOff size={18} /> : <Monitor size={18} />}
              <span className="hidden sm:block">{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
            </button>
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
              onClick={() => setActiveTab('whiteboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                activeTab === 'whiteboard' ? 'bg-white text-gray-900 border-blue-500' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'
              }`}
            >
              <PenTool size={16} />
              Whiteboard
            </button>
            <button 
              onClick={() => setActiveTab('screen')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                activeTab === 'screen' ? 'bg-white text-gray-900 border-blue-500' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'
              }`}
            >
              <Monitor size={16} />
              Screen Share {isScreenSharing && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1"></span>}
            </button>
          </div>

          {/* Content Container */}
          <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative">
            
            {/* Whiteboard Layer */}
            <div className={`absolute inset-0 z-20 ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}>
              <Whiteboard roomId={roomId} userRole={user.role} />
            </div>

            {/* Screen Share Layer */}
            <div className={`absolute inset-0 z-10 bg-gray-900 flex items-center justify-center ${activeTab === 'screen' ? 'block' : 'hidden'}`}>
              {!isScreenSharing ? (
                <div className="flex flex-col items-center justify-center text-gray-500 gap-4">
                  <Monitor size={48} className="opacity-20" />
                  <p className="font-medium text-lg">No active screen share.</p>
                  {user.role === 'teacher' && (
                    <button 
                      onClick={startScreenShare}
                      className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-semibold underline underline-offset-4"
                    >
                      Start sharing your screen
                    </button>
                  )}
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
          
          {user.role === 'teacher' && connectionStatus !== 'connected' && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-md border border-gray-700 text-gray-300 px-4 py-2 rounded-full text-sm flex items-center gap-2 z-30">
               <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"></div>
               Waiting for student to join...
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
