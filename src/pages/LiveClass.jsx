import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, Monitor, PenTool, VideoOff, Video as VideoIcon, Users, Mic, MicOff, PhoneOff } from 'lucide-react';

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
  const [connectionStatus, setConnectionStatus] = useState('waiting');
  const [roomId, setRoomId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  
  // Media States
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  
  const peerConnection = useRef(null);

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
      setDoc(roomRef, { isLive: true, activeStream: 'whiteboard' }, { merge: true });
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
          } else {
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
    if (!roomId || !user || !isLive) return;
    
    if (!peerConnection.current) {
        peerConnection.current = new RTCPeerConnection(configuration);
        
        // Add transceivers upfront to avoid renegotiation
        peerConnection.current.addTransceiver('audio', { direction: 'sendrecv' });
        peerConnection.current.addTransceiver('video', { direction: 'sendrecv' });

        peerConnection.current.addEventListener('iceconnectionstatechange', () => {
          console.log('ICE state:', peerConnection.current?.iceConnectionState);
          if (peerConnection.current?.iceConnectionState === 'connected') {
            setConnectionStatus('connected');
          } else if (peerConnection.current?.iceConnectionState === 'disconnected' || peerConnection.current?.iceConnectionState === 'failed') {
            setConnectionStatus('waiting');
          }
        });
        
        peerConnection.current.addEventListener('track', (event) => {
            console.log('Got remote track:', event.track.kind);
            if (event.track.kind === 'video' && remoteVideoRef.current) {
                // If it's a new stream, assign it
                if (remoteVideoRef.current.srcObject !== event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            } else if (event.track.kind === 'audio' && remoteAudioRef.current) {
                if (remoteAudioRef.current.srcObject !== event.streams[0]) {
                    remoteAudioRef.current.srcObject = event.streams[0];
                }
            }
        });

        if (user.role === 'teacher') {
          createRoom();
        } else if (user.role === 'student') {
          joinRoomById(roomId);
        }
    }

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    };
  }, [roomId, user, isLive]);

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

  const endClass = async () => {
      if (window.confirm("Are you sure you want to end the live class?")) {
          // Stop all local tracks
          if (localVideoRef.current && localVideoRef.current.srcObject) {
              localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
          }
          
          if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
          }
          
          if (roomId) {
            const roomRef = doc(db, 'liveRooms', roomId);
            await updateDoc(roomRef, { isLive: false, activeStream: null, offer: null, answer: null });
            await clearCandidates();
          }
          navigate('/teacher-dashboard');
      }
  };

  // Helper to replace track in transceiver
  const replaceTrack = (kind, newTrack) => {
      if (!peerConnection.current) return;
      const transceiver = peerConnection.current.getTransceivers().find(t => t.receiver.track.kind === kind);
      if (transceiver && transceiver.sender) {
          transceiver.sender.replaceTrack(newTrack);
      }
  };

  // Helper to get local stream from video ref
  const getLocalStream = () => {
      if (!localVideoRef.current) return null;
      return localVideoRef.current.srcObject;
  };

  // Helper to create or get local stream
  const getOrCreateLocalStream = () => {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
          return localVideoRef.current.srcObject;
      }
      const stream = new MediaStream();
      if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
      }
      return stream;
  };

  const stopVideoAndScreen = () => {
      const stream = getLocalStream();
      if (stream) {
          stream.getVideoTracks().forEach(track => {
              track.stop();
              stream.removeTrack(track);
          });
      }
      replaceTrack('video', null);
      setIsVideoOn(false);
      setIsScreenSharing(false);
      
      if (user.role === 'teacher') {
          setActiveTab('whiteboard');
          updateDoc(doc(db, 'liveRooms', roomId), { activeStream: 'whiteboard' });
      }
  };

  const toggleMic = async () => {
      if (isMicOn) {
          // Turn off
          const stream = getLocalStream();
          if (stream) {
              stream.getAudioTracks().forEach(track => {
                  track.stop();
                  stream.removeTrack(track);
              });
          }
          replaceTrack('audio', null);
          setIsMicOn(false);
      } else {
          // Turn on
          try {
              const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const audioTrack = audioStream.getAudioTracks()[0];
              const stream = getOrCreateLocalStream();
              stream.addTrack(audioTrack);
              replaceTrack('audio', audioTrack);
              setIsMicOn(true);
          } catch (err) {
              console.error("Error accessing microphone", err);
              alert("Could not access microphone.");
          }
      }
  };

  const toggleVideo = async () => {
      if (isVideoOn) {
          stopVideoAndScreen();
      } else {
          try {
              stopVideoAndScreen(); // clean up any existing screen share
              const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
              const videoTrack = videoStream.getVideoTracks()[0];
              
              const stream = getOrCreateLocalStream();
              stream.addTrack(videoTrack);
              replaceTrack('video', videoTrack);
              
              setIsVideoOn(true);
              setIsScreenSharing(false);
              
              if (user.role === 'teacher') {
                  setActiveTab('video');
                  updateDoc(doc(db, 'liveRooms', roomId), { activeStream: 'video' });
              }
              
              videoTrack.onended = () => {
                  stopVideoAndScreen();
              };
          } catch (err) {
              console.error("Error accessing camera", err);
              alert("Could not access camera.");
          }
      }
  };

  const startScreenShare = async () => {
    if (user.role !== 'teacher') return;
    
    if (isScreenSharing) {
        stopVideoAndScreen();
    } else {
        try {
            stopVideoAndScreen(); // stop any existing video
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = screenStream.getVideoTracks()[0];
            
            const stream = getOrCreateLocalStream();
            stream.addTrack(videoTrack);
            replaceTrack('video', videoTrack);
            
            setIsScreenSharing(true);
            setIsVideoOn(false);
            setActiveTab('screen');
            updateDoc(doc(db, 'liveRooms', roomId), { activeStream: 'screen' });
            
            videoTrack.onended = () => {
                stopVideoAndScreen();
            };
        } catch (err) {
            console.error("Error accessing screen", err);
            if (err.name !== 'NotAllowedError') {
                alert("Could not start screen share.");
            }
        }
    }
  };

  // WebRTC Signaling: Create Offer (Teacher)
  const createRoom = async () => {
    if (!roomId) return;
    setConnectionStatus('connecting');
    const roomRef = doc(db, 'liveRooms', roomId);
    
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

    peerConnection.current.onicecandidate = event => {
      if (!event.candidate) {
        return;
      }
      addDoc(callerCandidatesCollection, event.candidate.toJSON());
    };

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    await setDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } }, { merge: true });

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

  // WebRTC Signaling: Join Room (Student)
  const joinRoomById = async (roomId) => {
    setConnectionStatus('connecting');
    const roomRef = doc(db, 'liveRooms', roomId);
    
    onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data();
      if (data && data.offer) {
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

              await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });

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
      {/* Hidden audio element to play remote audio */}
      <audio ref={remoteAudioRef} autoPlay />

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
          {/* Audio/Video Controls for ALL users */}
          <button
            onClick={toggleMic}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
              isMicOn 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <MicOff size={18} /> : <Mic size={18} />}
            <span className="hidden sm:block">{isMicOn ? 'Mute' : 'Unmute'}</span>
          </button>

          <button
            onClick={toggleVideo}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
              isVideoOn 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title={isVideoOn ? "Stop Camera" : "Share Camera"}
          >
            {isVideoOn ? <VideoOff size={18} /> : <VideoIcon size={18} />}
            <span className="hidden sm:block">{isVideoOn ? 'Stop Video' : 'Share Video'}</span>
          </button>

          {/* Teacher Only Controls */}
          {user.role === 'teacher' && (
            <>
              <button
                onClick={startScreenShare}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                  isScreenSharing 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
              >
                {isScreenSharing ? <VideoOff size={18} /> : <Monitor size={18} />}
                <span className="hidden sm:block">{isScreenSharing ? 'Stop Screen' : 'Share Screen'}</span>
              </button>

              <button
                onClick={endClass}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm bg-red-600 hover:bg-red-700 text-white ml-2"
                title="End Live Class completely"
              >
                <PhoneOff size={18} />
                <span className="hidden sm:block">End Class</span>
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
          
          {/* Tabs for switching between Screen and Whiteboard (Teacher only, Student follows) */}
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

            {(activeTab === 'video' || (user.role === 'teacher' && isVideoOn)) && (
              <button 
                onClick={() => user.role === 'teacher' && setActiveTab('video')}
                disabled={user.role !== 'teacher'}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === 'video' ? 'bg-white text-gray-900 border-blue-500' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'
                } ${user.role !== 'teacher' && 'cursor-default'}`}
              >
                <VideoIcon size={16} />
                Teacher Video {(user.role === 'teacher' && isVideoOn) && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1"></span>}
              </button>
            )}
          </div>

          {/* Content Container */}
          <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative">
            
            {/* Whiteboard Layer */}
            <div className={`absolute inset-0 z-20 ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}>
              <Whiteboard roomId={roomId} userRole={user.role} />
            </div>

            {/* Media (Screen/Video) Layer - Main View */}
            <div className={`absolute inset-0 z-10 bg-gray-900 flex items-center justify-center ${activeTab === 'screen' || activeTab === 'video' ? 'block' : 'hidden'}`}>
                {/* 
                  If user is teacher, they see their own screen/video in the main view (localVideoRef).
                  If user is student, they see the teacher's screen/video in the main view (remoteVideoRef).
                */}
                <video 
                  ref={user.role === 'teacher' ? localVideoRef : remoteVideoRef}
                  autoPlay 
                  playsInline 
                  muted={user.role === 'teacher'} // Mute local echo
                  className="w-full h-full object-contain bg-black"
                />
            </div>
            
            {/* Picture-in-Picture (PiP) View */}
            {/* 
               If user is teacher, PiP shows the student's video (remoteVideoRef).
               If user is student, PiP shows their own video (localVideoRef).
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
          
          {user.role === 'teacher' && connectionStatus !== 'connected' && (isScreenSharing || isVideoOn) && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-md border border-gray-700 text-gray-300 px-4 py-2 rounded-full text-sm flex items-center gap-2 z-40">
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
