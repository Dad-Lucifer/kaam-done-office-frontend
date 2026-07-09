import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionTemplate, useMotionValue, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Headphones,
  MonitorUp,
  Grid,
  Phone,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  Participant,
  ConnectionState,
} from 'livekit-client';
import { fetchVoiceToken } from '../../../api/voice';

interface VoiceChannelProps {
  channelName: string;
}

interface ParticipantState {
  identity: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
}

const VoiceChannel: React.FC<VoiceChannelProps> = ({ channelName }) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [forceRelay, setForceRelay] = useState(false);

  const [micMuted, setMicMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [_activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());
  const [_localIdentity, setLocalIdentity] = useState('');

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Ultra-minimal spotlight, barely visible
  const backgroundSpotlight = useMotionTemplate`
    radial-gradient(
      500px circle at ${mouseX}px ${mouseY}px,
      rgba(255, 255, 255, 0.03),
      transparent 80%
    )
  `;

  function handleMouseMove({ currentTarget, clientX, clientY }: ReactMouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioElements = useRef<Map<string, HTMLAudioElement>>(new Map());
  // Prevent concurrent joinRoom calls and stale cleanup from aborting active connections
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);

  const buildParticipantState = useCallback(
    (p: Participant, isLocal: boolean): ParticipantState => ({
      identity: p.identity,
      isSpeaking: p.isSpeaking,
      isMuted: !p.isMicrophoneEnabled,
      isLocal,
    }),
    []
  );

  const syncParticipants = useCallback(
    (room: Room) => {
      const local = buildParticipantState(room.localParticipant, true);
      const remotes = Array.from(room.remoteParticipants.values()).map((rp) =>
        buildParticipantState(rp, false)
      );
      setParticipants([local, ...remotes]);
    },
    [buildParticipantState]
  );

  const attachRemoteAudio = useCallback(
    (track: Track, participant: RemoteParticipant) => {
      if (track.kind !== Track.Kind.Audio) return;
      const existing = remoteAudioElements.current.get(participant.identity);
      if (existing) {
        existing.remove();
        remoteAudioElements.current.delete(participant.identity);
      }
      const audioEl = track.attach() as HTMLAudioElement;
      audioEl.dataset.participantIdentity = participant.identity;
      audioEl.autoplay = true;
      audioEl.muted = deafened;
      if (audioContainerRef.current) {
        audioContainerRef.current.appendChild(audioEl);
      } else {
        document.body.appendChild(audioEl);
      }
      remoteAudioElements.current.set(participant.identity, audioEl);
    },
    [deafened]
  );

  const detachRemoteAudio = useCallback((participant: RemoteParticipant) => {
    const el = remoteAudioElements.current.get(participant.identity);
    if (el) {
      el.srcObject = null;
      el.remove();
      remoteAudioElements.current.delete(participant.identity);
    }
  }, []);

  const wireRoomEvents = useCallback(
    (room: Room) => {
      room
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          setConnectionState(state);
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          const ids = new Set(speakers.map((s) => s.identity));
          setActiveSpeakers(ids);
          setParticipants((prev) =>
            prev.map((p) => ({ ...p, isSpeaking: ids.has(p.identity) }))
          );
        })
        .on(RoomEvent.ParticipantConnected, (_p: RemoteParticipant) => {
          syncParticipants(room);
        })
        .on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          detachRemoteAudio(p);
          syncParticipants(room);
        })
        .on(
          RoomEvent.TrackSubscribed,
          (track, _pub, participant: RemoteParticipant) => {
            attachRemoteAudio(track, participant);
            syncParticipants(room);
          }
        )
        .on(
          RoomEvent.TrackUnsubscribed,
          (_track, _pub, participant: RemoteParticipant) => {
            detachRemoteAudio(participant);
          }
        )
        .on(RoomEvent.LocalTrackPublished, () => syncParticipants(room))
        .on(RoomEvent.LocalTrackUnpublished, () => syncParticipants(room))
        .on(RoomEvent.TrackMuted, () => syncParticipants(room))
        .on(RoomEvent.TrackUnmuted, () => syncParticipants(room))
        .on(RoomEvent.Disconnected, () => {
          setIsJoined(false);
          setConnectionState(ConnectionState.Disconnected);
          setParticipants([]);
          setActiveSpeakers(new Set());
          remoteAudioElements.current.forEach((el) => {
            el.srcObject = null;
            el.remove();
          });
          remoteAudioElements.current.clear();
        });
    },
    [syncParticipants, attachRemoteAudio, detachRemoteAudio]
  );

  /**
   * Do a quick HTTP pre-flight to the LiveKit server before opening the WebSocket.
   * This gives us a precise failure reason (unreachable vs not-running vs healthy)
   * in ~5 s instead of waiting the full 15 s WebSocket timeout.
   */
  const preflightCheck = async (livekitUrl: string, token: string): Promise<void> => {
    // Convert ws:// → http://, wss:// → https://
    const httpBase = livekitUrl.replace(/^wss?:\/\//, (m) =>
      m.startsWith('wss') ? 'https://' : 'http://'
    ).replace(/\/$/, '');

    const validateUrl = `${httpBase}/rtc/validate?access_token=${encodeURIComponent(token)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      await fetch(validateUrl, { signal: controller.signal, mode: 'no-cors' });
      // If we get ANY response (even CORS-opaque) the server is reachable
    } catch (err: unknown) {
      if (err instanceof Error) {
        const name = err.name;
        const msg  = err.message.toLowerCase();
        if (name === 'AbortError') {
          throw new Error(
            'PREFLIGHT_TIMEOUT: Cannot reach LiveKit at ' + httpBase +
            '\nPort 7880 may be blocked by Security Group, or the EC2 instance is stopped.'
          );
        }
        if (msg.includes('refused') || msg.includes('econnrefused')) {
          throw new Error(
            'PREFLIGHT_REFUSED: LiveKit server is not running on ' + httpBase +
            '\nSSH into your EC2 and start livekit-server.'
          );
        }
        if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
          throw new Error(
            'PREFLIGHT_NETWORK: Network error reaching ' + httpBase +
            '\nCheck that the EC2 instance is running and port 7880 is open.'
          );
        }
        // Any other fetch error (CORS, etc.) still means the server responded → ok to proceed
      }
    } finally {
      clearTimeout(timer);
    }
  };

  const joinRoom = async (useRelay = false) => {
    // Prevent concurrent connection attempts
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const { token, url, identity } = await fetchVoiceToken(channelName);

      if (!isMountedRef.current) return; // component unmounted while fetching token

      // ── Pre-flight: verify the LiveKit server is reachable before opening WS ──
      await preflightCheck(url, token);

      if (!isMountedRef.current) return;

      setLocalIdentity(identity);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
          ],
          iceTransportPolicy: useRelay ? 'relay' : 'all',
        },
      });
      roomRef.current = room;
      wireRoomEvents(room);

      const TIMEOUT_MS = 15_000;
      await Promise.race([
        room.connect(url, token),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), TIMEOUT_MS)
        ),
      ]);

      if (!isMountedRef.current) {
        room.disconnect();
        return;
      }

      await room.localParticipant.setMicrophoneEnabled(true);
      setIsJoined(true);
      setMicMuted(false);
      syncParticipants(room);
    } catch (err: unknown) {
      let msg = 'Failed to connect to voice channel.';
      if (err instanceof Error) {
        const raw = err.message.toLowerCase();
        // ── Pre-flight errors (precise diagnostics) ──
        if (err.message.startsWith('PREFLIGHT_TIMEOUT:')) {
          msg = 'LiveKit server is unreachable — EC2 may be stopped, or port 7880 is blocked by the Security Group.';
        } else if (err.message.startsWith('PREFLIGHT_REFUSED:')) {
          msg = 'LiveKit server is not running on your EC2. SSH in and start livekit-server.';
        } else if (err.message.startsWith('PREFLIGHT_NETWORK:')) {
          msg = 'Network error — EC2 instance may be stopped. Check AWS Console.';
        // ── WebSocket / connection errors ──
        } else if (err.message === 'CONNECTION_TIMEOUT' || raw.includes('timed out') || raw.includes('timeout')) {
          msg = 'Connection timed out — LiveKit server may not be listening on port 7880.';
        } else if (
          raw.includes('err_connection_refused') ||
          raw.includes('connection refused') ||
          raw.includes('failed to fetch') ||
          raw.includes('econnrefused')
        ) {
          msg = 'LiveKit server refused the connection. Is livekit-server running on EC2?';
        } else if (raw.includes('pc connection') || raw.includes('ice')) {
          msg = 'WebRTC ICE negotiation failed. Try Relay.';
          setForceRelay(true);
        } else if (raw.includes('websocket') || raw.includes('ws://') || raw.includes('wss://')) {
          msg = 'WebSocket connection failed. LiveKit may be bound to 127.0.0.1 — set bind_addresses: ["0.0.0.0"] in livekit.yaml.';
        } else if (raw.includes('abort') || raw.includes('user initiated')) {
          msg = ''; // swallow intentional disconnect-during-connect silently
        } else {
          msg = err.message;
        }
      }
      if (isMountedRef.current && msg) {
        setConnectionError(msg);
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    } finally {
      isConnectingRef.current = false;
      if (isMountedRef.current) {
        setIsConnecting(false);
      }
    }
  };

  const leaveRoom = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsJoined(false);
    setParticipants([]);
    setActiveSpeakers(new Set());
    setMicMuted(false);
    setDeafened(false);
    setConnectionError(null);
    setLocalIdentity('');
    remoteAudioElements.current.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    remoteAudioElements.current.clear();
  }, []);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micMuted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMicMuted(next);
    syncParticipants(room);
  }, [micMuted, syncParticipants]);

  const toggleDeafen = useCallback(() => {
    const next = !deafened;
    setDeafened(next);
    remoteAudioElements.current.forEach((el) => {
      el.muted = next;
    });
  }, [deafened]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isConnectingRef.current = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      remoteAudioElements.current.forEach((el) => {
        el.srcObject = null;
        el.remove();
      });
      remoteAudioElements.current.clear();
    };
  }, []);

  // ─── Render: Unjoined (Minimal) ────────────────────────────────────────

  if (!isJoined) {
    return (
      <div 
        className="flex flex-col h-full w-full bg-[#020204] relative z-10 overflow-hidden group"
        onMouseMove={handleMouseMove}
      >
        <motion.div
          className="pointer-events-none absolute -inset-px opacity-0 transition duration-1000 group-hover:opacity-100 z-0"
          style={{ background: backgroundSpotlight }}
        />

        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            {/* Elegant Channel Name */}
            <h1 className="font-sans font-light text-xl tracking-[0.3em] text-white/40 uppercase mb-16 text-center select-none">
              {channelName}
            </h1>

            {/* Minimal Join Ring */}
            <div className="relative flex items-center justify-center">
              {/* Subtle spinning dashed ring */}
              <div className="absolute w-[140px] h-[140px] rounded-full border border-dashed border-white/10 animate-[spin_10s_linear_infinite]" />
              
              <button
                onClick={() => { setForceRelay(false); joinRoom(false); }}
                disabled={isConnecting}
                className="relative z-10 w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center gap-2 bg-transparent border border-white/5 text-white/50 transition-all duration-500 hover:text-white hover:border-white/20 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {isConnecting && !forceRelay ? (
                  <Loader2 size={24} className="animate-spin" strokeWidth={1} />
                ) : (
                  <Mic size={24} strokeWidth={1} className="transition-transform duration-500" />
                )}
                <span className="font-sans text-[10px] tracking-[0.2em] uppercase mt-1">
                  {isConnecting && !forceRelay ? 'Joining' : 'Connect'}
                </span>
              </button>
            </div>
          </motion.div>

          {connectionError && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute bottom-12 flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-2 text-[#f87171] text-[12px] bg-transparent border border-[#f87171]/20 px-4 py-1.5 rounded-full">
                <AlertCircle size={14} strokeWidth={1.5} /> {connectionError}
              </div>
              {forceRelay && !isConnecting && (
                <button
                  className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest transition-colors"
                  onClick={() => joinRoom(true)}
                >
                  Retry via Relay
                </button>
              )}
            </motion.div>
          )}
        </div>

        <div ref={audioContainerRef} style={{ display: 'none' }} />
      </div>
    );
  }

  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 grid-rows-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 grid-rows-2 sm:grid-rows-1';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-2 sm:grid-cols-3 grid-rows-3 sm:grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-3';
  };

  // ─── Render: Joined (Grid / Google Meet Style) ───────────────────────────

  return (
    <div 
      className="flex flex-col h-full w-full bg-[#020204] relative z-10 overflow-hidden group"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-1000 group-hover:opacity-100 z-0"
        style={{ background: backgroundSpotlight }}
      />
      
      {/* Minimal Header */}
      <div className="absolute top-8 left-8 flex flex-col z-20">
        <h2 className="font-sans font-light text-[13px] tracking-[0.2em] text-white/40 uppercase">
          {channelName}
        </h2>
        <div className="flex items-center gap-2 mt-1.5 opacity-50">
          <span className={`w-1 h-1 rounded-full ${connectionState === ConnectionState.Reconnecting ? 'bg-[#fbbf24]' : 'bg-white'}`} />
          <span className="text-[9px] font-sans tracking-[0.2em] uppercase text-white/60">
            {connectionState === ConnectionState.Reconnecting ? 'Reconnecting' : 'Connected'}
          </span>
        </div>
      </div>

      <div ref={audioContainerRef} style={{ display: 'none' }} />

      {/* Google Meet Style Video Grid */}
      <div className="flex-1 w-full h-full p-4 sm:p-8 pt-24 pb-28 relative z-10 flex items-center justify-center">
        <div className={`w-full h-full max-h-[85vh] max-w-[95vw] grid gap-4 ${getGridClass(participants.length)}`}>
          <AnimatePresence>
            {participants.map((p) => (
              <motion.div
                key={p.identity}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center bg-[#1c1c1e] transition-all duration-300 border-4 ${
                  p.isSpeaking 
                    ? 'border-[#3b82f6] shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                    : 'border-transparent'
                }`}
              >
                {/* Avatar / Initial */}
                <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl sm:text-5xl text-white uppercase font-medium shadow-xl transition-transform duration-300 ${p.isSpeaking ? 'scale-110' : 'scale-100'}`}
                     style={{
                       background: `linear-gradient(135deg, hsl(${(p.identity.charCodeAt(0) * 45) % 360}, 70%, 50%), hsl(${(p.identity.charCodeAt(p.identity.length - 1) * 75) % 360}, 70%, 30%))`
                     }}>
                  {p.identity.charAt(0)}
                </div>

                {/* Name Tag (Bottom Left) */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
                  {p.isMuted ? (
                    <div className="w-6 h-6 rounded-full bg-[#ea4335] flex items-center justify-center text-white">
                      <MicOff size={12} strokeWidth={2.5} />
                    </div>
                  ) : p.isSpeaking ? (
                    <div className="w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center text-white">
                      <Mic size={12} strokeWidth={2.5} />
                    </div>
                  ) : null}
                  <span className="font-sans text-sm font-medium text-white drop-shadow-md">
                    {p.identity} {p.isLocal && <span className="text-white/60 text-xs ml-1">(You)</span>}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Google Meet Style Controls (Floating Bottom) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-3 p-3 bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              micMuted 
                ? 'bg-[#ea4335] text-white hover:bg-[#d93025]' 
                : 'bg-[#3c4043] text-white hover:bg-[#4a4d51]'
            }`}
          >
            {micMuted ? <MicOff size={20} strokeWidth={2} /> : <Mic size={20} strokeWidth={2} />}
          </button>

          <button
            onClick={toggleDeafen}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              deafened 
                ? 'bg-[#ea4335] text-white hover:bg-[#d93025]' 
                : 'bg-[#3c4043] text-white hover:bg-[#4a4d51]'
            }`}
          >
            <Headphones size={20} strokeWidth={2} />
          </button>

          <button className="w-12 h-12 rounded-full flex items-center justify-center bg-[#3c4043] text-white hover:bg-[#4a4d51] transition-all duration-300">
            <MonitorUp size={20} strokeWidth={2} />
          </button>

          <button className="w-12 h-12 rounded-full flex items-center justify-center bg-[#3c4043] text-white hover:bg-[#4a4d51] transition-all duration-300">
            <Grid size={20} strokeWidth={2} />
          </button>

          <div className="w-[1px] h-8 bg-white/10 mx-1" />

          <button
            onClick={leaveRoom}
            className="w-16 h-12 rounded-full flex items-center justify-center bg-[#ea4335] text-white hover:bg-[#d93025] transition-all duration-300"
          >
            <Phone size={20} className="rotate-[135deg]" strokeWidth={2} />
          </button>

        </div>
      </div>
    </div>
  );
};

export default VoiceChannel;
