import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, Monitor, PenTool, VideoOff, Video as VideoIcon, Users, Mic, MicOff, PhoneOff, Settings, AlertCircle } from 'lucide-react';

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
  
  // App States
  const [sessionState, setSessionState] = useState('PRE_JOIN'); // PRE_JOIN, WAITING_FOR_TEACHER, CONNECTING, CONNECTED
  const [roomId, setRoomId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [activeTab, setActiveTab] = useState('video'); // 'whiteboard', 'screen', 'video'
  const [error, setError] = useState('');
  
  // Media States
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const preJoinVideoRef = useRef(null);
  const localStream = useRef(null);
  const peerConnection = useRef(null);
  
  // Cleanup function for Firestore candidates
  const clearCandidates = async (roomIdToClear) => {
    if (!roomIdToClear) return;
    try {
      const roomRef = doc(db, 'liveRooms', roomIdToClear);
      const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
      const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
      
      const callerSnap = await getDocs(callerCandidatesCollection);
      callerSnap.forEach(d => deleteDoc(d.ref));
      
      const calleeSnap = await getDocs(calleeCandidatesCollection);
      calleeSnap.forEach(d => deleteDoc(d.ref));
    } catch (err) {
      console.error("Error clearing candidates:", err);
    }
  };

  // 1. Initialize Room ID and Firestore Listeners
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const currentRoomId = user.role === 'teacher' ? user.id : (user.role === 'student' ? user.assignedTeacherId : user.id);
    setRoomId(currentRoomId);
    
    // Setup listener for room state
    if (currentRoomId) {
      const roomRef = doc(db, 'liveRooms', currentRoomId);
      const unsub = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsLive(!!data.isLive);
          if (data.activeStream) {
            setActiveTab(data.activeStream);
          }
          
          if (!data.isLive && user.role === 'student' && sessionState === 'CONNECTED') {
              alert("The teacher has ended the class.");
              navigate('/dashboard');
          }
        } else {
          setIsLive(false);
          if (user.role === 'student' && sessionState === 'CONNECTED') {
              navigate('/dashboard');
          }
        }
      });
      return () => unsub();
    }
  }, [user, navigate, sessionState]);

  // 2. Setup Local Media (Pre-Join)
  useEffect(() => {
    const initLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStream.current = stream;
        
        if (preJoinVideoRef.current) {
          preJoinVideoRef.current.srcObject = stream;
        }
        
        // Sync initial state
        stream.getAudioTracks().forEach(track => track.enabled = isMicOn);
        stream.getVideoTracks().forEach(track => track.enabled = isVideoOn);
        
      } catch (err) {
        console.error("Error accessing media devices.", err);
        setError("Could not access camera/microphone. Please check permissions.");
        
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const videoStream = canvas.captureStream(1); // 1 fps
        
        // Audio Context for silent audio
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const dst = oscillator.connect(audioCtx.createMediaStreamDestination());
        oscillator.start();
        const audioTrack = dst.stream.getAudioTracks()[0];
        audioTrack.enabled = false;
        
        const emptyStream = new MediaStream([videoStream.getVideoTracks()[0], audioTrack]);
        localStream.current = emptyStream;
        
        if (preJoinVideoRef.current) {
           preJoinVideoRef.current.srcObject = emptyStream;
        }
      }
    };
    
    if (sessionState === 'PRE_JOIN') {
       initLocalMedia();
    }
    
  }, [sessionState]);

  // Update media tracks when toggled
  useEffect(() => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => track.enabled = isMicOn);
    }
  }, [isMicOn]);

  useEffect(() => {
    if (localStream.current && !isScreenSharing) {
      localStream.current.getVideoTracks().forEach(track => track.enabled = isVideoOn);
    }
  }, [isVideoOn, isScreenSharing]);

  // 3. WebRTC Setup Helper
  const setupWebRTC = () => {
    peerConnection.current = new RTCPeerConnection(configuration);
    
    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream.current);
      });
    }

    // Handle remote tracks
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    peerConnection.current.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', peerConnection.current.iceConnectionState);
      if (peerConnection.current.iceConnectionState === 'connected') {
        setSessionState('CONNECTED');
      } else if (peerConnection.current.iceConnectionState === 'disconnected' || peerConnection.current.iceConnectionState === 'failed') {
         console.warn("Connection lost");
      }
    };
    
    // Ensure local video ref is assigned in the active view
    setTimeout(() => {
       if (localVideoRef.current && localStream.current) {
           localVideoRef.current.srcObject = localStream.current;
       }
    }, 500);
  };

  // 4. Start Class (Teacher)
  const startClass = async () => {
    if (!roomId) return;
    setSessionState('CONNECTING');
    
    setupWebRTC();
    const roomRef = doc(db, 'liveRooms', roomId);
    
    // Clear old candidates
    await clearCandidates(roomId);
    
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

    peerConnection.current.onicecandidate = event => {
      if (!event.candidate) return;
      addDoc(callerCandidatesCollection, event.candidate.toJSON());
    };

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    await setDoc(roomRef, { 
      isLive: true,
      activeStream: 'video',
      offer: { type: offer.type, sdp: offer.sdp },
      answer: null
    });

    setSessionState('CONNECTED');

    // Listen for remote answer
    onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data();
      if (peerConnection.current && !peerConnection.current.currentRemoteDescription && data && data.answer) {
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

  // 5. Join Class (Student)
  const joinClass = async () => {
    if (!roomId || !isLive) return;
    setSessionState('CONNECTING');
    
    setupWebRTC();
    const roomRef = doc(db, 'liveRooms', roomId);
    
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

    peerConnection.current.onicecandidate = event => {
      if (!event.candidate) return;
      addDoc(calleeCandidatesCollection, event.candidate.toJSON());
    };

    // Get Offer
    const roomSnap = await getDocs(collection(db, 'liveRooms'));
    let offer = null;
    roomSnap.forEach(doc => {
        if (doc.id === roomId) offer = doc.data().offer;
    });

    if (offer) {
        try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);

            await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });
            
            setSessionState('CONNECTED');

            // Listen for remote ICE candidates
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
        } catch (err) {
            console.error("Error answering call", err);
            setError("Failed to connect to class.");
        }
    } else {
        setError("Teacher offer not found. They may have disconnected.");
        setSessionState('PRE_JOIN');
    }
  };

  // 6. End Class
  const endClass = async () => {
    if (window.confirm(user.role === 'teacher' ? "Are you sure you want to end the live class?" : "Are you sure you want to leave the class?")) {
      // Stop all tracks
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      
      if (user.role === 'teacher' && roomId) {
        const roomRef = doc(db, 'liveRooms', roomId);
        await updateDoc(roomRef, { isLive: false, activeStream: null, offer: null, answer: null });
        await clearCandidates(roomId);
      }
      
      navigate(user.role === 'teacher' ? '/teacher-dashboard' : '/dashboard');
    }
  };

  // 7. Screen Share (Teacher)
  const toggleScreenShare = async () => {
    if (user.role !== 'teacher') return;
    
    if (isScreenSharing) {
        // Stop screen share
        const videoSender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender && localStream.current) {
            const localVideoTrack = localStream.current.getVideoTracks()[0];
            videoSender.replaceTrack(localVideoTrack);
        }
        setIsScreenSharing(false);
        setActiveTab('video');
        updateDoc(doc(db, 'liveRooms', roomId), { activeStream: 'video' });
    } else {
        // Start screen share
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];
            
            const videoSender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
                videoSender.replaceTrack(screenTrack);
            }
            
            setIsScreenSharing(true);
            setActiveTab('screen');
            updateDoc(doc(db, 'liveRooms', roomId), { activeStream: 'screen' });
            
            screenTrack.onended = () => {
                const vs = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
                if (vs && localStream.current) {
                    vs.replaceTrack(localStream.current.getVideoTracks()[0]);
                }
                setIsScreenSharing(false);
                setActiveTab('video');
                updateDoc(doc(db, 'liveRooms', roomId), { activeStream: 'video' });
            };
        } catch (err) {
            console.error("Screen share error", err);
        }
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
      return () => {
          if (localStream.current) {
              localStream.current.getTracks().forEach(track => track.stop());
          }
          if (peerConnection.current) {
              peerConnection.current.close();
          }
      };
  }, []);

  if (!user) return null;

  // ==========================
  // UI RENDERING
  // ==========================

  // UI: Pre-Join Screen
  if (sessionState === 'PRE_JOIN') {
    return (
      <div className="h-screen bg-[#f0f2f5] flex flex-col items-center justify-center font-sans p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-4xl w-full flex flex-col md:flex-row gap-8 border border-gray-100">
          
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Ready to join?</h2>
            
            <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden mb-6 shadow-inner border border-gray-200">
              <video 
                ref={preJoinVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${!isVideoOn && 'hidden'}`}
              />
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400">
                  <VideoOff size={48} />
                </div>
              )}
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                <button 
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-4 rounded-full shadow-lg backdrop-blur-md transition-all ${isMicOn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                >
                  {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                <button 
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-4 rounded-full shadow-lg backdrop-blur-md transition-all ${isVideoOn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                >
                  {isVideoOn ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                </button>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 flex flex-col justify-center gap-6">
             <div className="text-center md:text-left">
                <h3 className="text-xl font-bold text-gray-900">VirtuLearn Live</h3>
                <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                  {user.role === 'teacher' 
                    ? "Check your camera and microphone before starting the class for your students." 
                    : "Check your audio and video before joining the teacher's live session."}
                </p>
             </div>
             
             {error && (
               <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                 <AlertCircle size={16} className="mt-0.5 shrink-0" />
                 <span>{error}</span>
               </div>
             )}

             {user.role === 'teacher' ? (
                <button 
                  onClick={startClass}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all"
                >
                  Start Live Class
                </button>
             ) : (
                <div className="space-y-4">
                  {isLive ? (
                    <button 
                      onClick={joinClass}
                      className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition-all animate-pulse"
                    >
                      Join Live Class
                    </button>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin mx-auto mb-3"></div>
                      <p className="text-sm font-medium text-gray-600">Waiting for teacher to start...</p>
                    </div>
                  )}
                </div>
             )}

             <button 
               onClick={() => navigate(user.role === 'teacher' ? '/teacher-dashboard' : '/dashboard')}
               className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-semibold shadow-sm transition-all"
             >
               Return to Dashboard
             </button>
          </div>
          
        </div>
      </div>
    );
  }

  // UI: Connecting Screen
  if (sessionState === 'CONNECTING') {
      return (
          <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white font-sans">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
              <h2 className="text-2xl font-bold mb-2">Connecting...</h2>
              <p className="text-gray-400">Establishing secure connection</p>
          </div>
      );
  }

  // UI: Live Session
  return (
    <div className="h-screen bg-[#f0f2f5] flex flex-col font-sans overflow-hidden">
      {/* Top Navigation */}
      <nav className="bg-gray-900 px-4 py-3 shadow-lg shrink-0 text-white flex items-center justify-between h-[60px] sm:h-[70px] z-20">
        <div className="flex items-center">
          <div className="flex items-center gap-3 pl-2">
            <span className="bg-red-500 w-3 h-3 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            <span className="font-bold text-lg tracking-tight">VirtuLearn Live</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Audio/Video Controls for ALL users */}
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
              !isMicOn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {!isMicOn ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
              !isVideoOn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {!isVideoOn ? <VideoOff size={18} /> : <VideoIcon size={18} />}
          </button>

          {/* Teacher Only Controls */}
          {user.role === 'teacher' && (
            <>
              <button
                onClick={toggleScreenShare}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                  isScreenSharing ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
              >
                {isScreenSharing ? <VideoOff size={18} /> : <Monitor size={18} />}
                <span className="hidden sm:block">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
              </button>
            </>
          )}

          <button
            onClick={endClass}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm bg-red-600 hover:bg-red-700 text-white ml-2"
          >
            <PhoneOff size={18} />
            <span className="hidden sm:block">{user.role === 'teacher' ? 'End Class' : 'Leave Class'}</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Presentation Area */}
        <div className="flex-1 flex flex-col bg-gray-800 relative z-10 p-2 md:p-4 transition-all">
          
          {/* Tabs for switching between Media and Whiteboard */}
          {user.role === 'teacher' && (
            <div className="flex items-center gap-2 mb-3 px-2">
              <button 
                onClick={() => {
                   setActiveTab('whiteboard');
                   updateDoc(doc(db, 'liveRooms', roomId), { activeStream: 'whiteboard' });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === 'whiteboard' ? 'bg-white text-gray-900 border-blue-500' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'
                }`}
              >
                <PenTool size={16} />
                Whiteboard
              </button>
              
              <button 
                onClick={() => {
                   setActiveTab(isScreenSharing ? 'screen' : 'video');
                   updateDoc(doc(db, 'liveRooms', roomId), { activeStream: isScreenSharing ? 'screen' : 'video' });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                  (activeTab === 'video' || activeTab === 'screen') ? 'bg-white text-gray-900 border-blue-500' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'
                }`}
              >
                <VideoIcon size={16} />
                Media
              </button>
            </div>
          )}

          {/* Content Container */}
          <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative">
            
            {/* Whiteboard Layer */}
            <div className={`absolute inset-0 z-20 ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}>
              <Whiteboard roomId={roomId} userRole={user.role} />
            </div>

            {/* Media Layer - Main View */}
            <div className={`absolute inset-0 z-10 bg-gray-900 flex items-center justify-center ${(activeTab === 'screen' || activeTab === 'video') ? 'block' : 'hidden'}`}>
                {/* 
                  Teacher sees their own media (localVideoRef)
                  Student sees teacher's media (remoteVideoRef)
                */}
                <video 
                  ref={user.role === 'teacher' ? localVideoRef : remoteVideoRef}
                  autoPlay 
                  playsInline 
                  muted={user.role === 'teacher'}
                  className="w-full h-full object-contain bg-black"
                />
            </div>
            
            {/* Picture-in-Picture (PiP) View */}
            {/* 
               Teacher sees student's media (remoteVideoRef)
               Student sees their own media (localVideoRef)
            */}
            <div className="absolute bottom-4 right-4 z-30 w-32 md:w-48 aspect-video bg-gray-800 border-2 border-gray-600 rounded-lg overflow-hidden shadow-xl shadow-black/50">
                <video 
                  ref={user.role === 'teacher' ? remoteVideoRef : localVideoRef}
                  autoPlay 
                  playsInline 
                  muted={user.role === 'student'} // Student mutes their own preview
                  className="w-full h-full object-cover bg-gray-900"
                />
                <div className="absolute bottom-1 left-2 text-[10px] font-semibold text-white/80 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {user.role === 'teacher' ? 'Student' : 'You'}
                </div>
            </div>

          </div>
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
