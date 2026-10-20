export function createPeerConnection(onRemoteStream) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    }
  };
  return pc;
}

export async function getLocalStream() {
  return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}
