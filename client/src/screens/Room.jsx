import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import { useNavigate } from "react-router-dom";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, Send, UserCheck, UserX, LogOut } from "lucide-react";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);
  const navigate = useNavigate();
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  const toggleMute = () => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const handleLeaveCall = () => {
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }

    setMyStream(null);
    setRemoteStream(null);
    setRemoteSocketId(null);
    navigate("/");
  }

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      padding: '20px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      backdropFilter: 'blur(10px)'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: 'white',
      margin: 0
    },
    statusBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '24px',
      fontSize: '14px',
      fontWeight: '600'
    },
    connected: {
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      color: '#22c55e',
      border: '2px solid rgba(34, 197, 94, 0.3)'
    },
    disconnected: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      color: '#ef4444',
      border: '2px solid rgba(239, 68, 68, 0.3)'
    },
    videoContainer: {
      display: 'grid',
      gridTemplateColumns: remoteStream ? '1fr 1fr' : '1fr',
      gap: '20px',
      marginBottom: '30px'
    },
    videoWrapper: {
      position: 'relative',
      backgroundColor: '#000',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
      aspectRatio: '16/9'
    },
    videoLabel: {
      position: 'absolute',
      top: '15px',
      left: '15px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: 10,
      backdropFilter: 'blur(10px)'
    },
    playerWrapper: {
      width: '100%',
      height: '100%'
    },
    controlsContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '15px',
      padding: '30px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      backdropFilter: 'blur(10px)'
    },
    button: {
      padding: '15px 30px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white'
    },
    successButton: {
      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      color: 'white'
    },
    dangerButton: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
      border: '2px solid rgba(255, 255, 255, 0.2)'
    },
    iconButton: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      backdropFilter: 'blur(10px)',
      textAlign: 'center'
    },
    emptyStateTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'white',
      marginTop: '20px',
      marginBottom: '10px'
    },
    emptyStateText: {
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.7)',
      marginBottom: '30px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Video Conference Room</h1>
        <div style={{ ...styles.statusBadge, ...(remoteSocketId ? styles.connected : styles.disconnected) }}>
          {remoteSocketId ? <UserCheck size={18} /> : <UserX size={18} />}
          {remoteSocketId ? "Connected" : "Waiting for participant"}
        </div>
      </div>

      {myStream || remoteStream ? (
        <>
          <div style={styles.videoContainer}>
            {remoteStream && (
              <div style={styles.videoWrapper}>
                <div style={styles.videoLabel}>Remote Participant</div>
                <div style={styles.playerWrapper}>
                  <ReactPlayer
                    playing
                    width="100%"
                    height="100%"
                    url={remoteStream}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              </div>
            )}
            {myStream && (
              <div style={styles.videoWrapper}>
                <div style={styles.videoLabel}>You</div>
                <div style={styles.playerWrapper}>
                  <ReactPlayer
                    playing
                    muted
                    width="100%"
                    height="100%"
                    url={myStream}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={styles.controlsContainer}>
            <button
              style={{ ...styles.iconButton, backgroundColor: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)' }}
              onClick={toggleMute}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              {isMuted ? <MicOff size={24} color="white" /> : <Mic size={24} color="white" />}
            </button>

            <button
              style={{ ...styles.iconButton, backgroundColor: isVideoOff ? '#ef4444' : 'rgba(255, 255, 255, 0.1)' }}
              onClick={toggleVideo}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              {isVideoOff ? <VideoOff size={24} color="white" /> : <Video size={24} color="white" />}
            </button>

            {myStream && (
              <button
                style={{ ...styles.button, ...styles.successButton }}
                onClick={sendStreams}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                <Send size={20} />
                Send Stream
              </button>
            )}

            {myStream && (
              <button
                style={{ ...styles.button, ...styles.primaryButton, paddingY: '10px' }}
                onClick={handleCallUser}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2) ';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                <Phone size={20} />
                Start Call
              </button>
            )}
            {myStream && (
              <button
                style={{ ...styles.button, ...styles.dangerButton }}
                onClick={handleLeaveCall}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                <LogOut size={20} />
                Leave Call
              </button>
            )}
          </div>
        </>
      ) : (
        <div style={styles.emptyState}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Video size={40} color="white" />
          </div>
          <h2 style={styles.emptyStateTitle}>Ready to Connect</h2>
          <p style={styles.emptyStateText}>
            {remoteSocketId
              ? "A participant has joined. Click the button below to start your call."
              : "Waiting for someone to join the room..."}
          </p>
          {remoteSocketId && (
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleCallUser}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
            >
              <Phone size={20} />
              Start Call
            </button>
          )}

        </div>
      )}
    </div>
  );
};

export default RoomPage;