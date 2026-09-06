import { api } from './api.js';
import { onSocket, sendSocket, connectSocket } from './socket.js';

// Peer-to-peer κλήση με WebRTC. Ο server μεταφέρει μόνο τη σηματοδοσία
// (προσφορά, απάντηση, υποψήφιες διαδρομές)· ήχος και εικόνα πάνε απευθείας
// από συσκευή σε συσκευή.
//
// Ρόλοι: όποιος μπει πρώτος περιμένει· μόλις εμφανιστεί ο δεύτερος, ο ένας από
// τους δύο κάνει την προσφορά. Για να μη γίνει «γυάλινη σύγκρουση» (glare),
// την προσφορά την κάνει πάντα ο συμμετέχων με το μικρότερο user id.
export function createCall({ roomId, selfId, peerId, video = true, onState, onRemoteStream, onLocalStream, onError }) {
  let pc = null;
  let localStream = null;
  let unsubscribe = null;
  let makingOffer = false;
  let closed = false;
  const polite = selfId > peerId;   // ο «ευγενικός» υποχωρεί σε σύγκρουση

  const setState = (state, detail) => onState?.(state, detail);

  async function start() {
    connectSocket();
    setState('requesting-media');
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
    } catch (err) {
      onError?.(mediaError(err));
      setState('failed');
      return;
    }
    onLocalStream?.(localStream);

    const { iceServers } = await api.get('/ice-servers').catch(() => ({ iceServers: [] }));
    pc = new RTCPeerConnection({ iceServers });

    for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

    pc.ontrack = (e) => onRemoteStream?.(e.streams[0]);
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSocket({ type: 'call:ice', room_id: roomId, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (!pc) return;
      if (pc.connectionState === 'connected') setState('connected');
      if (pc.connectionState === 'failed') setState('failed', 'Η σύνδεση δεν στάθηκε δυνατή');
      if (pc.connectionState === 'disconnected') setState('reconnecting');
    };
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        sendSocket({ type: 'call:offer', room_id: roomId, sdp: pc.localDescription });
      } catch (err) {
        onError?.(err.message);
      } finally {
        makingOffer = false;
      }
    };

    unsubscribe = onSocket(handleSignal);
    setState('waiting');
    // Λέει «είμαι εδώ»: αν ο άλλος περιμένει ήδη, θα ξεκινήσει η διαπραγμάτευση.
    sendSocket({ type: 'call:invite', room_id: roomId });
  }

  async function handleSignal(msg) {
    if (!pc || closed || msg.room_id !== roomId) return;

    if (msg.type === 'call:invite' && msg.from === peerId) {
      setState('ringing');
      // Ο ένας μόνο κάνει την προσφορά, ώστε να μη συγκρουστούν.
      if (!polite) {
        try {
          await pc.setLocalDescription();
          sendSocket({ type: 'call:offer', room_id: roomId, sdp: pc.localDescription });
        } catch (err) { onError?.(err.message); }
      } else {
        sendSocket({ type: 'call:invite', room_id: roomId });
      }
      return;
    }

    if (msg.type === 'call:offer') {
      const collision = makingOffer || pc.signalingState !== 'stable';
      if (collision && !polite) return;             // ο αγενής αγνοεί
      if (collision) await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
      await pc.setRemoteDescription(msg.sdp);
      await pc.setLocalDescription();
      sendSocket({ type: 'call:answer', room_id: roomId, sdp: pc.localDescription });
      setState('connecting');
      return;
    }

    if (msg.type === 'call:answer') {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(msg.sdp);
        setState('connecting');
      }
      return;
    }

    if (msg.type === 'call:ice' && msg.candidate) {
      try { await pc.addIceCandidate(msg.candidate); } catch { /* υποψήφια εκτός σειράς */ }
      return;
    }

    if (msg.type === 'call:hangup') {
      setState('ended', 'Ο συνομιλητής σου αποσυνδέθηκε');
      stop(false);
    }
  }

  function toggleAudio(on) {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = on; });
  }
  function toggleVideo(on) {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = on; });
  }

  function stop(notify = true) {
    if (closed) return;
    closed = true;
    if (notify) sendSocket({ type: 'call:hangup', room_id: roomId });
    unsubscribe?.();
    localStream?.getTracks().forEach((t) => t.stop());
    try { pc?.close(); } catch { /* ήδη κλειστό */ }
    pc = null;
  }

  return { start, stop, toggleAudio, toggleVideo, get connection() { return pc; } };
}

function mediaError(err) {
  if (err.name === 'NotAllowedError') return 'Δεν δόθηκε άδεια για μικρόφωνο/κάμερα. Έλεγξε τις ρυθμίσεις του browser.';
  if (err.name === 'NotFoundError') return 'Δεν βρέθηκε μικρόφωνο ή κάμερα σε αυτή τη συσκευή.';
  if (err.name === 'NotReadableError') return 'Η κάμερα ή το μικρόφωνο χρησιμοποιείται από άλλη εφαρμογή.';
  return `Δεν ήταν δυνατή η πρόσβαση στη συσκευή: ${err.message}`;
}
