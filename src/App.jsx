import { useRef, useState } from 'react';

const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const localPeerRef = useRef(null);
  const remotePeerRef = useRef(null);

  const [status, setStatus] = useState('Click “Start camera” to begin.');
  const [cameraReady, setCameraReady] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const stopTracks = (stream) => {
    if (!stream) {
      return;
    }

    for (const track of stream.getTracks()) {
      track.stop();
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCameraReady(true);
      setStatus('Camera is ready. Start the call to connect local ↔ remote.');
    } catch (error) {
      setStatus(`Unable to access camera/mic: ${error.message}`);
    }
  };

  const startCall = async () => {
    if (!localStreamRef.current) {
      setStatus('Please start the camera first.');
      return;
    }

    try {
      localPeerRef.current = new RTCPeerConnection(rtcConfig);
      remotePeerRef.current = new RTCPeerConnection(rtcConfig);

      localPeerRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          remotePeerRef.current.addIceCandidate(event.candidate);
        }
      };

      remotePeerRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          localPeerRef.current.addIceCandidate(event.candidate);
        }
      };

      remotePeerRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      for (const track of localStreamRef.current.getTracks()) {
        localPeerRef.current.addTrack(track, localStreamRef.current);
      }

      const offer = await localPeerRef.current.createOffer();
      await localPeerRef.current.setLocalDescription(offer);
      await remotePeerRef.current.setRemoteDescription(offer);

      const answer = await remotePeerRef.current.createAnswer();
      await remotePeerRef.current.setLocalDescription(answer);
      await localPeerRef.current.setRemoteDescription(answer);

      setCallActive(true);
      setStatus('Call active! This demo connects two peers in one browser tab.');
    } catch (error) {
      setStatus(`Failed to start call: ${error.message}`);
    }
  };

  const endCall = () => {
    if (localPeerRef.current) {
      localPeerRef.current.close();
      localPeerRef.current = null;
    }

    if (remotePeerRef.current) {
      remotePeerRef.current.close();
      remotePeerRef.current = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    stopTracks(localStreamRef.current);
    localStreamRef.current = null;

    setCameraReady(false);
    setCallActive(false);
    setStatus('Call ended. Click “Start camera” to begin again.');
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <h1>React Video Calling App</h1>
        <p className="subtitle">WebRTC local loopback demo</p>

        <div className="controls">
          <button type="button" onClick={startCamera} disabled={cameraReady}>
            Start camera
          </button>
          <button
            type="button"
            onClick={startCall}
            disabled={!cameraReady || callActive}
          >
            Start call
          </button>
          <button type="button" onClick={endCall} disabled={!cameraReady && !callActive}>
            End call
          </button>
        </div>

        <p className="status" role="status">
          {status}
        </p>

        <div className="videos">
          <article>
            <h2>You</h2>
            <video ref={localVideoRef} playsInline autoPlay muted />
          </article>
          <article>
            <h2>Remote peer</h2>
            <video ref={remoteVideoRef} playsInline autoPlay />
          </article>
        </div>
      </section>
    </main>
  );
}
