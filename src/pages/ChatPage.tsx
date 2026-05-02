import { useEffect, useMemo, useRef, useState } from "react";
import { enableWebSockets, trpc } from "@/lib/trpcClient";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  CalendarDays,
  Code2,
  FileCode2,
  Globe,
  Image,
  Link2,
  Lock,
  Maximize2,
  MessageSquare,
  Mic,
  MonitorUp,
  Phone,
  PhoneOff,
  PictureInPicture2,
  Play,
  Plus,
  Paperclip,
  Radio,
  ScanSearch,
  ScreenShare,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Video,
  WandSparkles,
  Wifi,
} from "lucide-react";

type EventKind =
  | "snippet"
  | "jump"
  | "guest"
  | "schedule"
  | "poll"
  | "reaction"
  | "minutes"
  | "annotation"
  | "execution"
  | "control"
  | "call"
  | "code-anchor"
  | "handoff"
  | "terminal-pip"
  | "ai-summary"
  | "action-item"
  | "translation"
  | "drawing"
  | "replay"
  | "attachment";

type EventMeta = {
  kind: EventKind;
  title?: string;
  lineRef?: string;
  language?: string;
  background?: string;
  quality?: string;
  link?: string;
  pollOptions?: string[];
  votes?: Record<string, number>;
  when?: string;
  note?: string;
  action?: string;
  assignee?: string;
  command?: string;
  languageName?: string;
  priority?: "low" | "normal" | "high";
  replayId?: string;
  sfuMode?: boolean;
  encrypted?: boolean;
  callId?: string;
  mode?: "voice" | "video" | "screen";
  targetUserId?: string;
  signalData?: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
  muted?: boolean;
  cameraOff?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  attachmentKind?: "file" | "image";
};

type IncomingCall = {
  callId: string;
  mode: "voice" | "video";
  fromUserId: string;
  offer: RTCSessionDescriptionInit;
};

function parseMeta(raw?: string | null): EventMeta | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EventMeta;
  } catch {
    return null;
  }
}

const CALL_SIGNAL_ACTIONS = new Set([
  "offer",
  "answer",
  "ice",
  "reject",
  "end",
  "missed",
  "failed",
  "media-state",
  "call-heartbeat",
]);

const turnServerUrl = String(import.meta.env.VITE_TURN_URL || "");
const activeCallSessionKey = "ocne-active-direct-call";

function getCallIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  if (turnServerUrl) {
    const turnUrls = turnServerUrl
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);
    const tcpFallbackUrls = turnUrls
      .filter((url) => url.startsWith("turn:") && !url.includes("transport="))
      .map((url) => `${url}${url.includes("?") ? "&" : "?"}transport=tcp`);

    servers.push({
      urls: [...turnUrls, ...tcpFallbackUrls],
      username: String(import.meta.env.VITE_TURN_USERNAME || ""),
      credential: String(import.meta.env.VITE_TURN_CREDENTIAL || ""),
    });
  }

  return servers;
}

function isCallSignal(meta: EventMeta | null) {
  return meta?.kind === "call" && Boolean(meta.action && CALL_SIGNAL_ACTIONS.has(meta.action));
}

function makeGuestLink() {
  const token = Math.random().toString(36).slice(2, 10);
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://127.0.0.1:3000";
  return `${baseUrl}/guest/${token}`;
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function ChatPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [activeRoom, setActiveRoom] = useState<string>("global");
  const [directRecipientId, setDirectRecipientId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [lastMessageId, setLastMessageId] = useState(0);
  const [threadSearch, setThreadSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [noiseCancel, setNoiseCancel] = useState(true);
  const [backgroundBlur, setBackgroundBlur] = useState(true);
  const [pipMode, setPipMode] = useState(false);
  const [encrypted, setEncrypted] = useState(false);
  const [bandwidthMode, setBandwidthMode] = useState("adaptive");
  const [callBackground, setCallBackground] = useState("Nebula IDE");
  const [recordedClipUrl, setRecordedClipUrl] = useState<string | null>(null);
  const [recordedClipName, setRecordedClipName] = useState("call-recording.webm");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPrivacy, setNewRoomPrivacy] = useState<"public" | "private">("public");
  const [inviteSearch, setInviteSearch] = useState("");
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [breakoutName, setBreakoutName] = useState("");
  const [snippetCode, setSnippetCode] = useState("");
  const [snippetLanguage, setSnippetLanguage] = useState("ts");
  const [lineRef, setLineRef] = useState("dashboard.php:128");
  const [callCodeAnchor, setCallCodeAnchor] = useState("src/pages/EditorPage.tsx:120");
  const [terminalShareCommand, setTerminalShareCommand] = useState("npm run build");
  const [actionItemText, setActionItemText] = useState("Fix the login validation bug");
  const [captionLanguage, setCaptionLanguage] = useState("English");
  const [drawingTarget, setDrawingTarget] = useState("active editor selection");
  const [scheduleAt, setScheduleAt] = useState("");
  const [annotation, setAnnotation] = useState("");
  const [pollQuestion, setPollQuestion] = useState("Should we ship after this review?");
  const [pollOptions, setPollOptions] = useState("Ship now\nReview once more\nSplit tasks");
  const [reaction, setReaction] = useState("++1");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [callState, setCallState] = useState<
    "idle" | "outgoing" | "incoming" | "connecting" | "connected"
  >("idle");
  const [callMode, setCallMode] = useState<"voice" | "video">("voice");
  const [roomMediaMode, setRoomMediaMode] = useState<"idle" | "voice" | "video" | "screen">("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const activeCallIdRef = useRef<string | null>(null);
  const processedSignalIdsRef = useRef<Set<number>>(new Set());
  const pendingScreenTrackRef = useRef<MediaStreamTrack | null>(null);
  const lastNotifiedIdRef = useRef<number | null>(null);
  const typingClearRef = useRef<number | null>(null);
  const callModeRef = useRef<"voice" | "video">("voice");
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const ringtoneContextRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const missedCallTimerRef = useRef<number | null>(null);
  const isCleaningUpCallRef = useRef(false);
  const cleanupPromiseRef = useRef<Promise<void> | null>(null);
  const outgoingCallPeerRef = useRef<string | null>(null);
  const iceRestartAttemptsRef = useRef(0);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [callSoundsReady, setCallSoundsReady] = useState(false);
  const [remoteMediaState, setRemoteMediaState] = useState({ muted: false, cameraOff: false });
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>("new");
  const [peerConnectionState, setPeerConnectionState] = useState<RTCPeerConnectionState>("new");
  const [callHealthMessage, setCallHealthMessage] = useState("Calls are ready when both users are online and browser permissions are allowed.");

  const { data: rooms, refetch: refetchRooms } = trpc.chat.rooms.useQuery();
  const { data: publicRooms, refetch: refetchPublicRooms } = trpc.chat.publicRooms.useQuery();
  const { data: directThreads, refetch: refetchDirectThreads } = trpc.chat.directThreads.useQuery(undefined, {
    refetchInterval: callState !== "idle" ? 2000 : enableWebSockets ? 30000 : 5000,
  });
  const { data: incomingCallOffers } = trpc.chat.incomingCallOffers.useQuery(
    { since: 0 },
    {
      enabled: Boolean(user?.id),
      refetchInterval: callState === "idle" || callState === "outgoing" ? (enableWebSockets ? 10000 : 3000) : false,
    },
  );
  const { data: callHistory } = trpc.chat.callHistory.useQuery(
    { limit: 8 },
    {
      enabled: Boolean(user?.id),
      refetchInterval: callState !== "idle" ? 3000 : 20000,
    },
  );
  const { data: onlineUsers } = trpc.user.onlineUsers.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const { data: notificationUnread } = trpc.notification.unread.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const { data: activeRoomSettings } = trpc.chat.roomSettings.useQuery(
    { roomId: Number(activeRoom) },
    { enabled: !directRecipientId && activeRoom !== "global" && !Number.isNaN(Number(activeRoom)) },
  );
  const { data: roomMembers } = trpc.chat.roomMembers.useQuery(
    { roomId: Number(activeRoom) },
    { enabled: !directRecipientId && activeRoom !== "global" && !Number.isNaN(Number(activeRoom)) },
  );
  const messageQueryInput = useMemo(
    () =>
      directRecipientId
        ? { receiverId: directRecipientId, since: lastMessageId }
        : { roomId: activeRoom, since: lastMessageId },
    [activeRoom, directRecipientId, lastMessageId],
  );
  const { data: messages, refetch } = trpc.chat.messages.useQuery(
    messageQueryInput,
    {
      refetchInterval: callState !== "idle"
        ? enableWebSockets ? 1200 : 800
        : enableWebSockets
          ? 15000
          : directRecipientId
            ? 2500
            : 5000,
    },
  );
  const { data: searchResults } = trpc.chat.searchMessages.useQuery(
    directRecipientId
      ? { query: messageSearch, receiverId: directRecipientId }
      : { query: messageSearch, roomId: activeRoom },
    { enabled: messageSearch.trim().length > 1 },
  );
  const { data: inviteSearchResults } = trpc.user.search.useQuery(
    { query: inviteSearch },
    { enabled: inviteSearch.trim().length > 0 },
  );

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: () => {
      setActionError(null);
      setMessageText("");
      refetch();
      refetchDirectThreads();
      void utils.chat.callHistory.invalidate();
    },
    onError: (error) => setActionError(error.message),
  });
  const markThreadRead = trpc.chat.markThreadRead.useMutation();
  const sendTyping = trpc.chat.sendTyping.useMutation();
  const presencePing = trpc.chat.presencePing.useMutation();
  const heartbeat = trpc.user.heartbeat.useMutation();
  const inviteToRoom = trpc.chat.inviteToRoom.useMutation({
    onError: (error) => setActionError(error.message),
  });
  const updateRoomSettings = trpc.chat.updateRoomSettings.useMutation({
    onError: (error) => setActionError(error.message),
  });
  const createRoom = trpc.chat.createRoom.useMutation({
    onSuccess: async ({ id }) => {
      setActionError(null);
      setNewRoomName("");
      setNewRoomPrivacy("public");
      setSelectedInviteIds([]);
      setInviteSearch("");
      setBreakoutName("");
      await refetchRooms();
      await refetchPublicRooms();
      setDirectRecipientId(null);
      setActiveRoom(String(id));
    },
    onError: (error) => setActionError(error.message),
  });
  const joinRoom = trpc.chat.joinRoom.useMutation({
    onSuccess: async () => {
      setActionError(null);
      await refetchRooms();
      await refetchPublicRooms();
    },
    onError: (error) => setActionError(error.message),
  });

  trpc.chat.onMessage.useSubscription(
    directRecipientId ? { receiverId: directRecipientId } : { roomId: activeRoom },
    {
      enabled: enableWebSockets && Boolean(user?.id),
      onData: () => {
        void utils.chat.messages.invalidate();
        void utils.chat.directThreads.invalidate();
        void utils.chat.callHistory.invalidate();
        void utils.chat.unreadCount.invalidate();
        void utils.notification.unread.invalidate();
        if (messageSearch.trim().length > 1) {
          void utils.chat.searchMessages.invalidate();
        }
      },
    },
  );

  trpc.chat.onTyping.useSubscription(
    directRecipientId ? { receiverId: directRecipientId } : { roomId: activeRoom },
    {
      enabled: enableWebSockets && Boolean(user?.id),
      onData: (event) => {
        if (String(event.userId) === String(user?.id)) {
          return;
        }
        if (typingClearRef.current) {
          window.clearTimeout(typingClearRef.current);
          typingClearRef.current = null;
        }
        if (event.isTyping) {
          setTypingLabel(`${event.username} is typing...`);
          typingClearRef.current = window.setTimeout(() => {
            setTypingLabel(null);
            typingClearRef.current = null;
          }, 3200);
        } else {
          setTypingLabel(null);
        }
      },
    },
  );

  trpc.chat.onPresence.useSubscription(undefined, {
    enabled: enableWebSockets && Boolean(user?.id),
    onData: () => {
      void utils.user.onlineUsers.invalidate();
    },
  });

  trpc.chat.onRoomCreated.useSubscription(undefined, {
    enabled: enableWebSockets && Boolean(user?.id),
    onData: () => {
      void utils.chat.rooms.invalidate();
    },
  });

  trpc.chat.onIncomingCall.useSubscription(undefined, {
    enabled: enableWebSockets && Boolean(user?.id),
    onData: (event) => {
      if (processedSignalIdsRef.current.has(event.messageId)) return;
      const meta = event.metadata as EventMeta;
      if (meta?.kind !== "call" || meta.action !== "offer" || !meta.callId || !meta.signalData || !meta.mode) return;
      const senderId = String(event.senderId);
      if (callState !== "idle" && !shouldAcceptCollidingOffer(senderId, meta.callId)) return;

      processedSignalIdsRef.current.add(event.messageId);
      void handleIncomingOffer(senderId, meta);
      void utils.chat.messages.invalidate();
      void utils.chat.directThreads.invalidate();
      void utils.chat.callHistory.invalidate();
      void utils.notification.unread.invalidate();
    },
  });

  const currentDirectUser = useMemo(() => {
    if (!directRecipientId) return null;
    return (
      directThreads?.find((thread) => String(thread.user?.id) === String(directRecipientId))?.user ||
      (onlineUsers || []).find((candidate) => String(candidate.id) === String(directRecipientId)) ||
      null
    );
  }, [directRecipientId, directThreads, onlineUsers]);
  const currentDirectThread = useMemo(() => {
    if (!directRecipientId) return null;
    return directThreads?.find((thread) => String(thread.user?.id) === String(directRecipientId)) || null;
  }, [directRecipientId, directThreads]);
  const canCallCurrentDirectUser = Boolean(currentDirectThread?.isFriend);
  const currentDirectUserOnline = currentDirectUser?.status === "online";
  const notificationPermission =
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
  const turnRelayConfigured = Boolean(turnServerUrl);
  const roomStatusLabel = directRecipientId
    ? currentDirectUserOnline
      ? "Online now"
      : `Last status: ${currentDirectUser?.status || "offline"}`
    : roomMediaMode !== "idle"
      ? `${roomMediaMode === "screen" ? "Screen share" : roomMediaMode} room live`
      : activeRoom === "global"
        ? "Open team room"
        : activeRoomSettings?.settings?.hasPermanentCall
          ? "Permanent room ready"
          : "On-demand room";
  const activeCallLabel = directRecipientId
    ? callState === "idle"
      ? "No active direct call"
      : `${callMode} call ${callState}`
    : roomMediaMode === "idle"
      ? "No room call running"
      : `${roomMediaMode} session live`;
  const recentCallHistory = useMemo(() => {
    return (callHistory || []).map((entry) => {
      const call = entry.call;
      const isCaller = String(call.callerId) === String(user?.id);
      const otherId = isCaller ? String(call.receiverId) : String(call.callerId);
      const threadUser = directThreads?.find((thread) => String(thread.user?.id) === otherId)?.user;
      return {
        id: call.id,
        label: threadUser?.name || threadUser?.username || entry.caller?.name || entry.caller?.username || "Teammate",
        direction: isCaller ? "Outgoing" : "Incoming",
        mode: call.mode,
        status: call.status,
        createdAt: call.createdAt,
      };
    });
  }, [callHistory, directThreads, user?.id]);

  const activeRoomRecord = useMemo(() => {
    if (directRecipientId || activeRoom === "global") return null;
    return rooms?.find((room) => String(room.id) === activeRoom) || null;
  }, [activeRoom, directRecipientId, rooms]);

  const activeRoomCreator = activeRoomSettings?.creator || activeRoomRecord?.creator || null;
  const isActiveRoomCreator =
    Boolean(user?.id) &&
    String(activeRoomSettings?.room?.createdBy || activeRoomRecord?.createdBy || "") === String(user?.id);
  const activeMembership = useMemo(() => {
    if (!user?.id) return null;
    return roomMembers?.find((entry) => String(entry.member.userId) === String(user.id))?.member || null;
  }, [roomMembers, user?.id]);
  const canManageActiveRoom =
    isActiveRoomCreator || ["owner", "admin"].includes(activeMembership?.role || "");

  const roomName = useMemo(() => {
    if (directRecipientId) {
      return currentDirectUser?.name || currentDirectUser?.username || "Direct Message";
    }
    if (activeRoom === "global") return "Global War Room";
    return rooms?.find((room) => String(room.id) === activeRoom)?.name || `Room ${activeRoom}`;
  }, [activeRoom, currentDirectUser, directRecipientId, rooms]);
  const incomingCallerName = useMemo(() => {
    if (!incomingCall) return "Someone";
    const caller =
      directThreads?.find((thread) => String(thread.user?.id) === incomingCall.fromUserId)?.user ||
      (onlineUsers || []).find((candidate) => String(candidate.id) === incomingCall.fromUserId);
    return caller?.name || caller?.username || "Someone";
  }, [directThreads, incomingCall, onlineUsers]);

  const participants = useMemo(() => {
    if (directRecipientId) {
      return [currentDirectUser, user]
        .filter(Boolean)
        .map((entry) => ({
          id: String(entry!.id),
          name: entry!.name,
          username: entry!.username,
          avatar: entry!.avatar,
          status: entry!.status,
        }));
    }
    if (activeRoom !== "global" && roomMembers?.length) {
      return roomMembers.map((entry) => entry.user).filter(Boolean);
    }
    return onlineUsers || [];
  }, [activeRoom, currentDirectUser, directRecipientId, onlineUsers, roomMembers, user]);

  const inviteCandidates = useMemo(() => {
    const map = new Map<string, NonNullable<typeof onlineUsers>[number]>();
    for (const candidate of onlineUsers || []) {
      if (String(candidate.id) !== String(user?.id)) {
        map.set(String(candidate.id), candidate);
      }
    }
    for (const candidate of inviteSearchResults || []) {
      if (String(candidate.id) !== String(user?.id)) {
        map.set(String(candidate.id), candidate);
      }
    }
    return [...map.values()].slice(0, 10);
  }, [inviteSearchResults, onlineUsers, user?.id]);

  const selectedInvitees = useMemo(() => {
    return selectedInviteIds
      .map((id) => inviteCandidates.find((candidate) => String(candidate.id) === id))
      .filter(Boolean);
  }, [inviteCandidates, selectedInviteIds]);

  const filteredThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    const rows = directThreads || [];
    if (!q) return rows;
    return rows.filter((thread) => {
      const label = thread.user?.name || thread.user?.username || "";
      const preview = thread.latestMessage?.content || "";
      return label.toLowerCase().includes(q) || preview.toLowerCase().includes(q);
    });
  }, [directThreads, threadSearch]);

  const speakerId = useMemo(() => {
    const latest = [...(messages || [])].reverse().find((item) => item.sender?.id);
    return latest?.sender?.id ?? participants[0]?.id;
  }, [messages, participants]);

  const enrichedMessages = useMemo(() => {
    return (messages || []).map((item) => ({
      ...item,
      meta: parseMeta(item.message.metadata),
    }));
  }, [messages]);

  const searchedMessages = useMemo(() => {
    return (searchResults || []).map((item) => ({
      ...item,
      meta: parseMeta(item.message.metadata),
    }));
  }, [searchResults]);

  const visibleEnrichedMessages = useMemo(() => {
    return enrichedMessages.filter((entry) => !isCallSignal(entry.meta));
  }, [enrichedMessages]);

  const visibleSearchedMessages = useMemo(() => {
    return searchedMessages.filter((entry) => !isCallSignal(entry.meta));
  }, [searchedMessages]);

  const streamEntries = messageSearch.trim().length > 1 ? visibleSearchedMessages : visibleEnrichedMessages;

  const transcriptEntries = useMemo(() => {
    const q = transcriptSearch.trim().toLowerCase();
    return streamEntries.filter((entry) => {
      if (!q) return true;
      return (
        entry.message.content.toLowerCase().includes(q) ||
        entry.sender?.name?.toLowerCase().includes(q) ||
        entry.sender?.username?.toLowerCase().includes(q)
      );
    });
  }, [streamEntries, transcriptSearch]);
  const latestMessageLabel = useMemo(() => {
    const latest = streamEntries[streamEntries.length - 1];
    if (!latest) return "No messages yet";
    return new Date(latest.message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [streamEntries]);

  const latestMinutes = useMemo(() => {
    return [...enrichedMessages].reverse().find((entry) => entry.meta?.kind === "minutes");
  }, [enrichedMessages]);

  const activePoll = useMemo(() => {
    return [...enrichedMessages].reverse().find((entry) => entry.meta?.kind === "poll");
  }, [enrichedMessages]);

  const threadOptions = useMemo(() => {
    const rows = filteredThreads.map((thread) => ({
      id: String(thread.user?.id),
      label: thread.user?.name || thread.user?.username || "Teammate",
      avatar: thread.user?.avatar,
      preview: thread.latestMessage?.content || "Friend accepted. Start private conversation",
      unreadCount: thread.unreadCount || 0,
      status: thread.user?.status || "offline",
      isFriend: Boolean(thread.isFriend),
    }));

    return rows.slice(0, 14);
  }, [filteredThreads]);

  const callBackgroundClass = useMemo(() => {
    if (callBackground === "Terminal Dark") {
      return "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,#020617,#020617_52%,#05130d)]";
    }
    if (callBackground === "Graph Paper") {
      return "bg-[#f8fafc] bg-[linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:22px_22px]";
    }
    return "bg-[radial-gradient(circle_at_20%_20%,rgba(29,155,240,0.28),transparent_32%),radial-gradient(circle_at_78%_35%,rgba(168,85,247,0.2),transparent_34%),linear-gradient(135deg,#020617,#111827)]";
  }, [callBackground]);

  const localVideoClassName = `h-full w-full object-cover transition-all ${backgroundBlur ? "contrast-105 saturate-110" : ""}`;
  const meetingControlButtonClass =
    "min-h-11 h-auto w-full justify-start rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left leading-snug whitespace-normal text-slate-200 shadow-sm shadow-black/20 hover:border-cyan-500/30 hover:bg-cyan-500/[0.08] [&_svg]:shrink-0";
  const meetingOptionButtonClass =
    "min-h-10 h-auto w-full justify-start rounded-xl px-3 py-2 text-left text-xs leading-snug whitespace-normal transition-colors";

  function stopRingtone() {
    if (ringtoneTimerRef.current) {
      window.clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
  }

  function playRingtone(mode: "voice" | "video") {
    if (typeof window === "undefined" || ringtoneTimerRef.current) return;
    const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = ringtoneContextRef.current || new AudioContextConstructor();
    ringtoneContextRef.current = context;
    if (context.state === "suspended" && !callSoundsReady) {
      setCallHealthMessage("Browser audio is waiting for a user click. Use Enable call alerts for reliable ringtone playback.");
    }
    const frequencies = mode === "video" ? [660, 880] : [440, 660];
    let index = 0;

    const ring = () => {
      if (context.state === "suspended") {
        void context.resume().catch(() => {
          setCallHealthMessage("The browser blocked ringtone playback until the page receives a user gesture.");
        });
      }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequencies[index % frequencies.length];
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.6);
      index += 1;
    };

    ring();
    ringtoneTimerRef.current = window.setInterval(ring, 1400);
  }

  async function enableCallAlerts() {
    if (typeof window === "undefined") return;
    const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (AudioContextConstructor) {
      const context = ringtoneContextRef.current || new AudioContextConstructor();
      ringtoneContextRef.current = context;
      await context.resume().catch(() => undefined);
      setCallSoundsReady(context.state === "running");
    }

    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotificationsEnabled(permission === "granted");
    }

    setCallHealthMessage("Call alerts checked. Keep this page open for browser popups, ringtone, and direct WebRTC signaling.");
  }

  function showIncomingCallNotification(mode: "voice" | "video", senderId: string) {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    const caller = directThreads?.find((thread) => String(thread.user?.id) === senderId)?.user;
    const name = caller?.name || caller?.username || "Someone";
    const note = new Notification(`Incoming ${mode} call`, {
      body: `${name} is calling you in OCNE Chat.`,
      tag: `ocne-call-${senderId}`,
      requireInteraction: true,
    });
    window.setTimeout(() => note.close(), 15000);
  }

  function shouldAcceptCollidingOffer(senderId: string, incomingCallId: string) {
    if (callState !== "outgoing" || outgoingCallPeerRef.current !== senderId || !activeCallIdRef.current) {
      return false;
    }
    return incomingCallId.localeCompare(activeCallIdRef.current) < 0;
  }

  async function handleIncomingOffer(senderId: string, meta: EventMeta) {
    if (!meta.callId || !meta.signalData || !meta.mode) return;
    if (callState !== "idle") {
      if (!shouldAcceptCollidingOffer(senderId, meta.callId)) {
        await sendMessage.mutateAsync({
          content: "Call collision resolved",
          receiverId: senderId,
          messageType: "text",
          metadata: JSON.stringify({
            kind: "call",
            title: "Call declined",
            action: "reject",
            callId: meta.callId,
            mode: meta.mode === "video" ? "video" : "voice",
            targetUserId: senderId,
            note: "Another call setup is already in progress.",
          } satisfies EventMeta),
        }).catch(() => undefined);
        return;
      }
      await cleanupActiveCall(false);
    }

    const mode = meta.mode === "video" ? "video" : "voice";
    if (missedCallTimerRef.current) {
      window.clearTimeout(missedCallTimerRef.current);
    }
    activeCallIdRef.current = meta.callId;
    outgoingCallPeerRef.current = null;
    setActiveRoom("global");
    setDirectRecipientId(senderId);
    setIncomingCall({
      callId: meta.callId,
      mode,
      fromUserId: senderId,
      offer: meta.signalData as RTCSessionDescriptionInit,
    });
    setCallMode(mode);
    callModeRef.current = mode;
    setCallState("incoming");
    setActionError(`${mode === "video" ? "Video" : "Voice"} call incoming.`);
    playRingtone(mode);
    showIncomingCallNotification(mode, senderId);
    missedCallTimerRef.current = window.setTimeout(() => {
      if (activeCallIdRef.current !== meta.callId) return;
      void sendMessage.mutateAsync({
        content: `${mode} call missed`,
        receiverId: senderId,
        messageType: "text",
        metadata: JSON.stringify({
          kind: "call",
          title: "Missed call",
          action: "missed",
          callId: meta.callId,
          mode,
          targetUserId: senderId,
        } satisfies EventMeta),
      }).catch(() => undefined);
      stopRingtone();
      setIncomingCall(null);
      setCallState("idle");
      activeCallIdRef.current = null;
      setActionError("Missed call.");
    }, 45_000);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    presencePing.mutate({ status: "online" });
    const timer = window.setInterval(() => {
      heartbeat.mutate({ status: "online" });
      presencePing.mutate({ status: "online" });
    }, 20000);
    return () => window.clearInterval(timer);
  }, [heartbeat, presencePing]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setBrowserNotificationsEnabled(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    return () => {
      stopRingtone();
      if (missedCallTimerRef.current) {
        window.clearTimeout(missedCallTimerRef.current);
      }
      void ringtoneContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!browserNotificationsEnabled || typeof window === "undefined" || !("Notification" in window)) return;
    const latest = notificationUnread?.[0];
    if (!latest || latest.isRead || lastNotifiedIdRef.current === latest.id) return;
    const body = latest.content || latest.title;
    lastNotifiedIdRef.current = latest.id;
    const note = new Notification(latest.title, { body });
    return () => note.close();
  }, [browserNotificationsEnabled, notificationUnread]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedCall = window.sessionStorage.getItem(activeCallSessionKey);
    if (!savedCall) return;
    window.sessionStorage.removeItem(activeCallSessionKey);
    setActionError("The previous direct call was interrupted by a page reload. Start the call again to create a fresh peer connection.");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!directRecipientId || callState === "idle" || callState === "incoming" || !activeCallIdRef.current) {
      window.sessionStorage.removeItem(activeCallSessionKey);
      return;
    }
    window.sessionStorage.setItem(
      activeCallSessionKey,
      JSON.stringify({
        callId: activeCallIdRef.current,
        peerId: directRecipientId,
        mode: callModeRef.current,
        state: callState,
        savedAt: Date.now(),
      }),
    );
  }, [callState, directRecipientId]);

  useEffect(() => {
    if (!directRecipientId || !activeCallIdRef.current || callState === "idle" || callState === "incoming") return;
    const timer = window.setInterval(() => {
      if (!activeCallIdRef.current) return;
      void sendWebRTCSignal(".", {
        kind: "call",
        title: "Call heartbeat",
        action: "call-heartbeat",
        callId: activeCallIdRef.current,
        mode: callModeRef.current,
        targetUserId: directRecipientId,
      });
    }, 15000);
    return () => window.clearInterval(timer);
  // sendWebRTCSignal is intentionally excluded because it is a local helper around the current direct recipient.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, directRecipientId]);

  useEffect(() => {
    if (!user?.id || (callState !== "idle" && callState !== "outgoing")) return;
    const incomingOffer = (incomingCallOffers || []).find((entry) => {
      const meta = entry.metadata as EventMeta | null;
      if (!entry.message || !meta || !isCallSignal(meta)) return false;
      if (meta.action !== "offer" || !meta.callId || !meta.signalData || !meta.mode) return false;
      if (processedSignalIdsRef.current.has(entry.message.id)) return false;
      if (String(entry.message.senderId) === String(user.id)) return false;
      if (String(entry.message.receiverId) !== String(user.id)) return false;
      if (callState !== "idle" && !shouldAcceptCollidingOffer(String(entry.message.senderId), meta.callId)) return false;
      return true;
    });
    if (incomingOffer?.message) {
      processedSignalIdsRef.current.add(incomingOffer.message.id);
      void handleIncomingOffer(String(incomingOffer.message.senderId), incomingOffer.metadata as EventMeta);
      return;
    }

    const incomingThread = (directThreads || []).find((thread) => {
      const latest = thread.latestMessage;
      const meta = thread.latestMetadata as EventMeta | null;
      if (!latest || !meta || !isCallSignal(meta)) return false;
      if (meta.action !== "offer" || !meta.callId || !meta.signalData || !meta.mode) return false;
      if (processedSignalIdsRef.current.has(latest.id)) return false;
      if (String(latest.senderId) === String(user.id)) return false;
      if (String(latest.receiverId) !== String(user.id)) return false;
      if (callState !== "idle" && !shouldAcceptCollidingOffer(String(latest.senderId), meta.callId)) return false;
      return Date.now() - new Date(latest.createdAt).getTime() < 120_000;
    });
    if (!incomingThread?.latestMessage) return;
    processedSignalIdsRef.current.add(incomingThread.latestMessage.id);
    void handleIncomingOffer(
      String(incomingThread.latestMessage.senderId),
      incomingThread.latestMetadata as EventMeta,
    );
  // handleIncomingOffer uses live refs/timers and should not restart this polling bridge every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, directThreads, incomingCallOffers, user?.id]);

  useEffect(() => {
    setLastMessageId(0);
    setMessageText("");
    setMessageSearch("");
    if (!directRecipientId) {
      void cleanupActiveCall(false);
    }
  // cleanupActiveCall intentionally stays out of deps because it is a local async teardown helper.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom, directRecipientId]);

  useEffect(() => {
    if (directRecipientId) {
      markThreadRead.mutate({ userId: directRecipientId });
    }
  }, [directRecipientId, markThreadRead]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const maxId = Math.max(...messages.map((m) => m.message.id), lastMessageId);
      if (maxId > lastMessageId) {
        setLastMessageId(maxId);
      }
    }
  }, [messages, lastMessageId]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const trimmed = messageText.trim();
    const timer = window.setTimeout(() => {
      sendTyping.mutate({
        roomId: directRecipientId ? undefined : activeRoom,
        receiverId: directRecipientId || undefined,
        isTyping: trimmed.length > 0,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeRoom, directRecipientId, messageText, sendTyping, user?.id]);

  useEffect(() => {
    if (!directRecipientId) return;

    const relevantSignals = enrichedMessages.filter(
      (entry) =>
        entry.meta?.kind === "call" &&
        typeof entry.message.id === "number" &&
        !processedSignalIdsRef.current.has(entry.message.id),
    );

    void (async () => {
      for (const entry of relevantSignals) {
        processedSignalIdsRef.current.add(entry.message.id);
        const meta = entry.meta;
        if (!meta?.action || !meta.callId) continue;
        if (String(entry.message.senderId) === String(user?.id)) continue;
        if (meta.targetUserId && String(meta.targetUserId) !== String(user?.id)) continue;

        if (
          meta.action === "offer" &&
          meta.signalData &&
          meta.mode &&
          activeCallIdRef.current === meta.callId &&
          peerConnectionRef.current
        ) {
          const pc = peerConnectionRef.current;
          await pc.setRemoteDescription(
            new RTCSessionDescription(meta.signalData as RTCSessionDescriptionInit),
          );
          await flushPendingIceCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendWebRTCSignal(".", {
            kind: "call",
            title: "Call reconnection accepted",
            action: "answer",
            callId: meta.callId,
            mode: meta.mode === "video" ? "video" : "voice",
            targetUserId: String(entry.message.senderId),
            signalData: answer,
          });
          setCallState("connecting");
          continue;
        }

        if (meta.action === "offer" && meta.signalData && meta.mode) {
          await handleIncomingOffer(String(entry.message.senderId), meta);
        }

        if (meta.action === "answer" && meta.signalData && activeCallIdRef.current === meta.callId) {
          const pc = peerConnectionRef.current;
          await pc?.setRemoteDescription(
            new RTCSessionDescription(meta.signalData as RTCSessionDescriptionInit),
          );
          await flushPendingIceCandidates(pc);
          setCallState("connecting");
        }

        if (meta.action === "ice" && meta.signalData && activeCallIdRef.current === meta.callId) {
          const pc = peerConnectionRef.current;
          if (pc?.remoteDescription) {
            await pc.addIceCandidate(
              new RTCIceCandidate(meta.signalData as RTCIceCandidateInit),
            );
          } else {
            pendingIceCandidatesRef.current.push(meta.signalData as RTCIceCandidateInit);
          }
        }

        if (meta.action === "media-state" && activeCallIdRef.current === meta.callId) {
          setRemoteMediaState({
            muted: Boolean(meta.muted),
            cameraOff: Boolean(meta.cameraOff),
          });
        }

        if (meta.action === "reject" && activeCallIdRef.current === meta.callId) {
          setActionError("Call declined.");
          await cleanupActiveCall(false);
        }

        if (meta.action === "end" && activeCallIdRef.current === meta.callId) {
          setActionError("Call ended.");
          await cleanupActiveCall(false);
        }

        if (meta.action === "missed" && activeCallIdRef.current === meta.callId) {
          setActionError("Call missed.");
          await cleanupActiveCall(false);
        }

        if (meta.action === "failed" && activeCallIdRef.current === meta.callId) {
          setActionError(meta.note || "Call connection failed.");
          await cleanupActiveCall(false);
        }
      }
    })();
  // cleanupActiveCall intentionally stays out of deps because it is a local async teardown helper.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, directRecipientId, enrichedMessages, user?.id]);

  function attachStreamToVideo(video: HTMLVideoElement | null, stream: MediaStream) {
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => {
      setCallHealthMessage("Browser autoplay blocked the call preview. Click the video area to resume playback.");
    });
  }

  async function flushPendingIceCandidates(pc: RTCPeerConnection | null | undefined) {
    if (!pc) {
      pendingIceCandidatesRef.current = [];
      return;
    }
    while (pendingIceCandidatesRef.current.length) {
      const candidate = pendingIceCandidatesRef.current.shift();
      if (!candidate) continue;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        setCallHealthMessage("One queued network candidate could not be applied. The call will continue trying other paths.");
      }
    }
  }

  async function ensureLocalStream(mode: "voice" | "video") {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not allow microphone or camera access on this page.");
    }

    if (
      localStreamRef.current &&
      localStreamRef.current.getAudioTracks().length > 0 &&
      (mode === "voice" || localStreamRef.current.getVideoTracks().length > 0)
    ) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: noiseCancel
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : true,
      video: mode === "video",
    });
    localStreamRef.current = stream;
    attachStreamToVideo(localVideoRef.current, stream);
    setHasLocalStream(true);
    setIsMuted(false);
    setIsCameraOff(mode === "voice");
    return stream;
  }

  async function attemptIceRestart(pc: RTCPeerConnection, callId: string) {
    if (!directRecipientId || activeCallIdRef.current !== callId) return;
    if (iceRestartAttemptsRef.current >= 2) {
      setCallHealthMessage("ICE restart failed twice. Ending the call so both sides can retry cleanly.");
      await sendWebRTCSignal("Call connection failed", {
        kind: "call",
        title: "Call connection failed",
        action: "failed",
        callId,
        mode: callModeRef.current,
        targetUserId: directRecipientId,
        note: "WebRTC could not recover the media path after ICE restart attempts.",
      }).catch(() => undefined);
      await cleanupActiveCall(false);
      return;
    }

    iceRestartAttemptsRef.current += 1;
    setCallHealthMessage("Connection lost. Attempting an ICE restart...");
    try {
      pc.restartIce();
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await sendWebRTCSignal("Call reconnecting", {
        kind: "call",
        title: "Call reconnection offer",
        action: "offer",
        callId,
        mode: callModeRef.current,
        targetUserId: directRecipientId,
        signalData: offer,
      });
    } catch (error) {
      setCallHealthMessage(error instanceof Error ? error.message : "ICE restart failed.");
      await cleanupActiveCall(true);
    }
  }

  function createPeerConnection(callId: string) {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
    }
    isCleaningUpCallRef.current = false;

    setIceConnectionState("new");
    setPeerConnectionState("new");
    iceRestartAttemptsRef.current = 0;
    setCallHealthMessage(turnServerUrl ? "Using STUN plus configured TURN relay for this call." : "Using public STUN only. Some corporate or strict NAT networks may need TURN.");

    const pc = new RTCPeerConnection({
      iceServers: getCallIceServers(),
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate || !directRecipientId) return;
      void sendWebRTCSignal(
        ".",
        {
          kind: "call",
          title: "Call signal",
          action: "ice",
          callId,
          mode: callModeRef.current,
          targetUserId: directRecipientId,
          signalData: event.candidate.toJSON(),
        },
      );
    };

    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current?.addTrack(track);
      });
      if (remoteVideoRef.current) {
        attachStreamToVideo(remoteVideoRef.current, remoteStreamRef.current);
      }
      setHasRemoteStream(true);
      setCallState("connected");
    };

    pc.onconnectionstatechange = () => {
      setPeerConnectionState(pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallState("connected");
        setCallHealthMessage("Peer connection established.");
      }
      if (pc.connectionState === "disconnected") {
        setCallHealthMessage("The call connection was interrupted. Waiting for the browser to recover it.");
      }
      if (pc.connectionState === "failed") {
        void attemptIceRestart(pc, callId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      setIceConnectionState(pc.iceConnectionState);
      if (pc.iceConnectionState === "checking") {
        setCallHealthMessage("Checking network path between both browsers...");
      }
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        iceRestartAttemptsRef.current = 0;
        setCallHealthMessage("Media path is connected.");
      }
      if (pc.iceConnectionState === "failed") {
        void attemptIceRestart(pc, callId);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }

  async function cleanupActiveCall(sendEndSignal: boolean) {
    if (cleanupPromiseRef.current) {
      await cleanupPromiseRef.current;
      return;
    }

    isCleaningUpCallRef.current = true;
    const cleanupPeerConnection = peerConnectionRef.current;
    const cleanupLocalStream = localStreamRef.current;
    const cleanupRemoteStream = remoteStreamRef.current;
    const cleanupScreenTrack = pendingScreenTrackRef.current;
    const cleanupCallId = activeCallIdRef.current;

    cleanupPromiseRef.current = (async () => {
      stopRingtone();
      if (missedCallTimerRef.current) {
        window.clearTimeout(missedCallTimerRef.current);
        missedCallTimerRef.current = null;
      }
      if (sendEndSignal && directRecipientId && cleanupCallId) {
        await sendWebRTCSignal(".", {
          kind: "call",
          title: "Call ended",
          action: "end",
          callId: cleanupCallId,
          mode: callModeRef.current,
          targetUserId: directRecipientId,
        }).catch(() => undefined);
      }

      if (cleanupPeerConnection) {
        cleanupPeerConnection.onconnectionstatechange = null;
        cleanupPeerConnection.oniceconnectionstatechange = null;
        cleanupPeerConnection.onicecandidate = null;
        cleanupPeerConnection.ontrack = null;
        cleanupPeerConnection.close();
      }
      if (peerConnectionRef.current === cleanupPeerConnection) {
        peerConnectionRef.current = null;
      }
      pendingIceCandidatesRef.current = [];

      cleanupScreenTrack?.stop();
      if (pendingScreenTrackRef.current === cleanupScreenTrack) {
        pendingScreenTrackRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;

      cleanupLocalStream?.getTracks().forEach((track) => track.stop());
      if (localStreamRef.current === cleanupLocalStream) {
        localStreamRef.current = null;
      }
      cleanupRemoteStream?.getTracks().forEach((track) => track.stop());
      if (remoteStreamRef.current === cleanupRemoteStream) {
        remoteStreamRef.current = null;
      }

      if (localVideoRef.current && localVideoRef.current.srcObject === cleanupLocalStream) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject === cleanupRemoteStream) {
        remoteVideoRef.current.srcObject = null;
      }

      setHasLocalStream(false);
      setHasRemoteStream(false);
      setIncomingCall(null);
      setIsSharingScreen(false);
      setIsMuted(false);
      setIsCameraOff(false);
      setRemoteMediaState({ muted: false, cameraOff: false });
      setRecording(false);
      setCallState("idle");
      setRoomMediaMode("idle");
      setIceConnectionState("new");
      setPeerConnectionState("new");
      outgoingCallPeerRef.current = null;
      iceRestartAttemptsRef.current = 0;
      if (activeCallIdRef.current === cleanupCallId) {
        activeCallIdRef.current = null;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(activeCallSessionKey);
      }
    })().finally(() => {
      cleanupPromiseRef.current = null;
      isCleaningUpCallRef.current = false;
    });

    await cleanupPromiseRef.current;
  }

  async function startDirectCall(mode: "voice" | "video") {
    if (!directRecipientId) return;
    if (!canCallCurrentDirectUser) {
      setActionError("You can start voice and video calls only after the friend request is accepted.");
      return;
    }
    if (cleanupPromiseRef.current) {
      await cleanupPromiseRef.current;
    }
    setActionError(null);
    const callId = crypto.randomUUID();
    activeCallIdRef.current = callId;
    outgoingCallPeerRef.current = directRecipientId;
    setCallMode(mode);
    callModeRef.current = mode;
    setCallState("outgoing");

    const stream = await ensureLocalStream(mode);
    const pc = createPeerConnection(callId);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await sendWebRTCSignal(
      `${mode} call`,
      {
        kind: "call",
        title: `${mode} call invitation`,
        action: "offer",
        callId,
        mode,
        targetUserId: directRecipientId,
        signalData: offer,
      },
    );
  }

  async function acceptIncomingCall() {
    if (!incomingCall || !directRecipientId) return;
    try {
      if (cleanupPromiseRef.current) {
        await cleanupPromiseRef.current;
      }
      stopRingtone();
      if (missedCallTimerRef.current) {
        window.clearTimeout(missedCallTimerRef.current);
        missedCallTimerRef.current = null;
      }
      setActionError(null);
      activeCallIdRef.current = incomingCall.callId;
      setCallMode(incomingCall.mode);
      callModeRef.current = incomingCall.mode;
      setCallState("connecting");

      const stream = await ensureLocalStream(incomingCall.mode);
      const pc = createPeerConnection(incomingCall.callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      await flushPendingIceCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendWebRTCSignal(
        ".",
        {
          kind: "call",
          title: `${incomingCall.mode} call accepted`,
          action: "answer",
          callId: incomingCall.callId,
          mode: incomingCall.mode,
          targetUserId: directRecipientId,
          signalData: answer,
        },
      );

      setIncomingCall(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The browser blocked this call action.");
      await cleanupActiveCall(false);
    }
  }

  async function rejectIncomingCall() {
    if (!incomingCall || !directRecipientId) return;
    stopRingtone();
    if (missedCallTimerRef.current) {
      window.clearTimeout(missedCallTimerRef.current);
      missedCallTimerRef.current = null;
    }
    await sendWebRTCSignal(".", {
      kind: "call",
      title: "Call declined",
      action: "reject",
      callId: incomingCall.callId,
      mode: incomingCall.mode,
      targetUserId: directRecipientId,
    });
    setIncomingCall(null);
    setCallState("idle");
  }

  function toggleMute() {
    const nextMuted = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
    if (directRecipientId && activeCallIdRef.current) {
      void sendWebRTCSignal(".", {
        kind: "call",
        title: "Media state changed",
        action: "media-state",
        callId: activeCallIdRef.current,
        mode: callModeRef.current,
        targetUserId: directRecipientId,
        muted: nextMuted,
        cameraOff: isCameraOff,
      });
    }
  }

  function toggleCamera() {
    const nextOff = !isCameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextOff;
    });
    setIsCameraOff(nextOff);
    if (directRecipientId && activeCallIdRef.current) {
      void sendWebRTCSignal(".", {
        kind: "call",
        title: "Media state changed",
        action: "media-state",
        callId: activeCallIdRef.current,
        mode: callModeRef.current,
        targetUserId: directRecipientId,
        muted: isMuted,
        cameraOff: nextOff,
      });
    }
  }

  async function handleToggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!localStreamRef.current) {
      setActionError("Start a voice, video, or screen-share call before recording.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setActionError("This browser does not support call recording.");
      return;
    }

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(localStreamRef.current);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: recorder.mimeType || "video/webm",
      });
      if (recordedClipUrl) {
        URL.revokeObjectURL(recordedClipUrl);
      }
      const url = URL.createObjectURL(blob);
      setRecordedClipUrl(url);
      setRecordedClipName(`call-recording-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`);
      setActionError("Recording stopped. A local recording download is ready in Meeting controls.");
    };
    recorder.start();
    setRecording(true);
    setActionError(null);
    await sendStructuredMessage("Call recording started.", {
      kind: "minutes",
      title: "Recording started",
      action: "recording-started",
    });
  }

  async function handleTogglePip() {
    const video = remoteVideoRef.current || localVideoRef.current;
    const pipDocument = document as Document & {
      pictureInPictureElement?: Element | null;
      exitPictureInPicture?: () => Promise<void>;
    };

    if (!video) {
      setActionError("Start a video or screen-share call before using PiP.");
      return;
    }
    if (!("requestPictureInPicture" in video) || !pipDocument.exitPictureInPicture) {
      setActionError("This browser does not support picture-in-picture for this video.");
      return;
    }

    try {
      if (pipDocument.pictureInPictureElement) {
        await pipDocument.exitPictureInPicture();
        setPipMode(false);
      } else {
        await (video as HTMLVideoElement & { requestPictureInPicture: () => Promise<PictureInPictureWindow> }).requestPictureInPicture();
        setPipMode(true);
      }
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Picture-in-picture could not be started.");
    }
  }

  function applyBandwidthMode(mode: string) {
    const bitrateByMode: Record<string, number | undefined> = {
      adaptive: undefined,
      quality: 2_500_000,
      bandwidth: 450_000,
    };
    const maxBitrate = bitrateByMode[mode];
    const pc = peerConnectionRef.current;

    pc?.getSenders().forEach((sender) => {
      if (!sender.track || !["audio", "video"].includes(sender.track.kind)) return;
      const parameters = sender.getParameters();
      parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
      parameters.encodings = parameters.encodings.map((encoding) => ({
        ...encoding,
        maxBitrate: sender.track?.kind === "video" ? maxBitrate : undefined,
      }));
      void sender.setParameters(parameters).catch(() => {
        setActionError("Bandwidth mode changed, but this browser could not apply sender parameters.");
      });
    });
  }

  function handleBandwidthMode(mode: string) {
    setBandwidthMode(mode);
    applyBandwidthMode(mode);
    setActionError(
      mode === "adaptive"
        ? "Bandwidth set to adaptive."
        : mode === "quality"
          ? "Bandwidth set to quality mode."
          : "Bandwidth set to low-bandwidth mode.",
    );
  }

  function handleToggleNoiseCancel() {
    const next = !noiseCancel;
    setNoiseCancel(next);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      void track
        .applyConstraints({
          echoCancellation: next,
          noiseSuppression: next,
          autoGainControl: next,
        })
        .catch(() => {
          setActionError("Noise control changed for new calls. This browser cannot update the live microphone track.");
        });
    });
  }

  function handleToggleEncrypted() {
    setEncrypted((current) => {
      const next = !current;
      setActionError(next ? "E2E mode enabled for new call events." : "E2E mode disabled for new call events.");
      return next;
    });
  }

  async function toggleScreenShare() {
    const pc = peerConnectionRef.current;
    if (!pc) {
      setActionError("Start or accept a video call before sharing your screen in a direct message.");
      return;
    }

    if (isSharingScreen) {
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      const sender = pc.getSenders().find((item) => item.track?.kind === "video");
      if (sender && cameraTrack) {
        await sender.replaceTrack(cameraTrack);
      }
      pendingScreenTrackRef.current?.stop();
      pendingScreenTrackRef.current = null;
      setIsSharingScreen(false);
      setActionError(null);
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Your browser does not support screen sharing on this page.");
    }

    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const displayTrack = displayStream.getVideoTracks()[0];
    const sender = pc.getSenders().find((item) => item.track?.kind === "video");
    if (sender) {
      await sender.replaceTrack(displayTrack);
    }
    pendingScreenTrackRef.current = displayTrack;
    displayTrack.onended = () => {
      void toggleScreenShare();
    };
    setIsSharingScreen(true);
    setActionError(null);
  }

  async function sendWebRTCSignal(content: string, meta: EventMeta) {
    if (!directRecipientId) return;
    await sendMessage.mutateAsync({
      content,
      receiverId: directRecipientId,
      messageType: "text",
      metadata: JSON.stringify(meta),
    });
  }

  async function sendStructuredMessage(content: string, meta: EventMeta, messageType: "text" | "code" | "file" | "image" = "text") {
    if (directRecipientId && !canCallCurrentDirectUser) {
      setActionError("You can message or call this person only after the friend request is accepted.");
      return;
    }
    await sendMessage.mutateAsync({
      content,
      roomId: directRecipientId ? undefined : activeRoom,
      receiverId: directRecipientId || undefined,
      messageType,
      metadata: JSON.stringify(meta),
    });
  }

  async function uploadAndSendFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    if (directRecipientId && !canCallCurrentDirectUser) {
      setActionError("You can send files to this person only after the friend request is accepted.");
      return;
    }

    setIsUploadingAttachment(true);
    setActionError(null);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/chat/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error || "Upload failed.");
        }

        const isImage = result.kind === "image" || String(result.mimeType || "").startsWith("image/");
        await sendMessage.mutateAsync({
          content: isImage ? `Photo: ${result.name}` : `File: ${result.name}`,
          roomId: directRecipientId ? undefined : activeRoom,
          receiverId: directRecipientId || undefined,
          messageType: isImage ? "image" : "file",
          metadata: JSON.stringify({
            kind: "attachment",
            title: isImage ? "Photo uploaded" : "File uploaded",
            attachmentKind: isImage ? "image" : "file",
            fileUrl: result.url,
            fileName: result.name,
            fileSize: result.size,
            mimeType: result.mimeType,
          } satisfies EventMeta),
        });
      }
      await refetch();
      await refetchDirectThreads();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploadingAttachment(false);
    }
  }

  function handleSend() {
    if (!messageText.trim()) return;
    if (directRecipientId && !canCallCurrentDirectUser) {
      setActionError("You can message this person only after the friend request is accepted.");
      return;
    }
    sendMessage.mutate({
      content: messageText.trim(),
      roomId: directRecipientId ? undefined : activeRoom,
      receiverId: directRecipientId || undefined,
      messageType: messageText.includes("```") ? "code" : "text",
    });
  }

  async function handleCreateRoom() {
    if (!newRoomName.trim()) return;
    await createRoom.mutateAsync({
      name: newRoomName.trim(),
      type: "group",
      memberIds: selectedInviteIds,
      settings: {
        isPrivate: newRoomPrivacy === "private",
        allowGuests: newRoomPrivacy === "public",
        hasPermanentCall: true,
      },
    });
  }

  function toggleInvitee(userId: string) {
    setSelectedInviteIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function openDirectMessage(userId: string) {
    setActiveRoom("global");
    setDirectRecipientId(userId);
    setMessageSearch("");
  }

  function openRoom(roomId: string) {
    setDirectRecipientId(null);
    setActiveRoom(roomId);
  }

  async function handleJoinPublicRoom(roomId: number) {
    await joinRoom.mutateAsync({ roomId });
    openRoom(String(roomId));
  }

  async function handleCreateBreakout() {
    if (!breakoutName.trim()) return;
    await createRoom.mutateAsync({
      name: `Breakout: ${breakoutName.trim()}`,
      type: "group",
      memberIds: selectedInviteIds,
      settings: {
        isPrivate: true,
        allowGuests: false,
        hasPermanentCall: true,
      },
    });
  }

  async function handleShareSnippet() {
    if (!snippetCode.trim()) return;
    const fenced = `\`\`\`${snippetLanguage}\n${snippetCode.trim()}\n\`\`\``;
    await sendStructuredMessage(fenced, {
      kind: "snippet",
      title: "Code snippet shared in call",
      language: snippetLanguage,
    }, "code");
    setSnippetCode("");
  }

  async function handleJumpToLine() {
    if (!lineRef.trim()) return;
    await sendStructuredMessage(
      `Jump requested from \`${lineRef.trim()}\` into the active call.`,
      {
        kind: "jump",
        title: "Jump into call from code line",
        lineRef: lineRef.trim(),
      },
    );
  }

  async function handleScheduleMeeting() {
    if (!scheduleAt.trim()) return;
    await sendStructuredMessage(
      `Meeting scheduled for ${scheduleAt}. Calendar sync event published to this room.`,
      {
        kind: "schedule",
        title: "Meeting scheduled",
        when: scheduleAt,
      },
    );
  }

  async function handleSendGuestLink() {
    const link = makeGuestLink();
    try {
      await navigator.clipboard?.writeText(link);
      setActionError("Guest link copied and posted to the room.");
    } catch {
      setActionError("Guest link posted. Browser clipboard permission was not available.");
    }
    await sendStructuredMessage(
      `Secure guest access created: ${link}`,
      {
        kind: "guest",
        title: "Guest access link",
        link,
        encrypted,
      },
      "file",
    );
  }

  async function handlePublishMinutes() {
    const lines = transcriptEntries
      .slice(-3)
      .map((entry) => `${entry.sender?.name || entry.sender?.username || "User"}: ${entry.message.content}`)
      .join("\n");
    await sendStructuredMessage(
      `Automated meeting minutes published.\n${lines || "No transcript items yet."}`,
      {
        kind: "minutes",
        title: "Automated meeting minutes",
        note: lines,
      },
    );
  }

  async function handleAnnotation() {
    if (!annotation.trim()) return;
    await sendStructuredMessage(
      `Annotation shared:\n${annotation.trim()}`,
      {
        kind: "annotation",
        title: "In-call annotation",
        note: annotation.trim(),
      },
    );
    setAnnotation("");
  }

  async function handleRunInBackground() {
    if (callState === "idle" && roomMediaMode === "idle") {
      setActionError("Start a call first, then queue background execution for that meeting.");
      return;
    }
    setActionError("Background execution queued for this active meeting.");
    await sendStructuredMessage(
      "Background code execution queued while screen share stays live.",
      {
        kind: "execution",
        title: "Background execution",
        action: "queued",
      },
    );
  }

  async function handleRemoteControl() {
    if (!isSharingScreen && roomMediaMode !== "screen") {
      setActionError("Share your screen first, then request remote control.");
      return;
    }
    setActionError("Remote control request posted. The other person must approve it in the room.");
    await sendStructuredMessage(
      "Remote control requested for the active shared cursor.",
      {
        kind: "control",
        title: "Remote control request",
        action: "request-control",
      },
    );
  }

  async function handlePinCallToCode() {
    if (!callCodeAnchor.trim()) return;
    setActionError("Call pinned to the selected code context.");
    await sendStructuredMessage(
      `Call pinned to \`${callCodeAnchor.trim()}\`.`,
      {
        kind: "code-anchor",
        title: "Code-anchored call",
        lineRef: callCodeAnchor.trim(),
        action: "pin-call-to-code",
      },
    );
  }

  async function handleRequestHandoff() {
    setActionError("Pair-programming handoff requested. The teammate must approve control.");
    await sendStructuredMessage(
      `Handoff requested for \`${callCodeAnchor.trim() || lineRef.trim()}\`.`,
      {
        kind: "handoff",
        title: "Pair-programming handoff",
        lineRef: callCodeAnchor.trim() || lineRef.trim(),
        action: "request-cursor-terminal-control",
        priority: "high",
      },
    );
  }

  async function handleShareTerminalPip() {
    if (!terminalShareCommand.trim()) return;
    setActionError("Terminal PiP shared with the call timeline.");
    await sendStructuredMessage(
      `Terminal PiP shared: \`${terminalShareCommand.trim()}\`.`,
      {
        kind: "terminal-pip",
        title: "Terminal picture-in-picture",
        command: terminalShareCommand.trim(),
        action: "share-terminal-output",
      },
    );
  }

  async function handleCreateAiMeetingSummary() {
    const refs = transcriptEntries
      .slice(-5)
      .map((entry) => `${entry.sender?.name || entry.sender?.username || "User"}: ${entry.message.content}`)
      .join("\n");
    setActionError("AI meeting summary drafted with code context.");
    await sendStructuredMessage(
      `AI meeting summary created for ${callCodeAnchor.trim() || "the current call"}.\n${refs || "No transcript lines yet."}`,
      {
        kind: "ai-summary",
        title: "AI meeting summary",
        lineRef: callCodeAnchor.trim(),
        note: refs,
        action: "summarize-call-with-code-links",
      },
    );
  }

  async function handleCreateActionItem() {
    if (!actionItemText.trim()) return;
    setActionError("Action item added to the project call stream.");
    await sendStructuredMessage(
      `Action item: ${actionItemText.trim()}`,
      {
        kind: "action-item",
        title: "AI action item",
        note: actionItemText.trim(),
        lineRef: callCodeAnchor.trim(),
        assignee: user?.name || user?.username || "Current user",
        priority: "normal",
      },
    );
  }

  async function handleEnableTranslatedCaptions() {
    setActionError(`Translated captions set to ${captionLanguage}.`);
    await sendStructuredMessage(
      `Live translated captions enabled: ${captionLanguage}.`,
      {
        kind: "translation",
        title: "Live translated captions",
        languageName: captionLanguage,
        action: "enable-translated-captions",
      },
    );
  }

  async function handleStartDrawingOverlay() {
    setActionError("Temporary drawing overlay published to collaborators.");
    await sendStructuredMessage(
      `Drawing overlay started on ${drawingTarget.trim() || "the editor"}.`,
      {
        kind: "drawing",
        title: "Screen drawing overlay",
        note: drawingTarget.trim(),
        action: "start-temporary-markup",
      },
    );
  }

  async function handleCreateSyncedReplay() {
    const replayId = crypto.randomUUID();
    setActionError("Synced replay marker created for this call and code timeline.");
    await sendStructuredMessage(
      `Shared replay marker saved for \`${callCodeAnchor.trim() || "current session"}\`.`,
      {
        kind: "replay",
        title: "Call + code replay",
        replayId,
        lineRef: callCodeAnchor.trim(),
        action: "save-synced-replay-marker",
      },
    );
  }

  async function startRoomMedia(mode: "voice" | "video") {
    setActionError(
      `${mode === "voice" ? "Voice" : "Video"} rooms need an SFU or mesh WebRTC signaling before they can carry real multi-party audio/video. Direct one-to-one calls are available now.`,
    );
    await sendStructuredMessage(
      `${mode === "voice" ? "Voice" : "Video"} room call was requested, but multi-party media is not enabled yet.`,
      {
        kind: "call",
        title: "Room media unavailable",
        action: "failed",
        mode,
        note: "Room voice/video needs an SFU such as LiveKit, Mediasoup, Daily, or a mesh signaling layer.",
      },
    ).catch(() => undefined);
  }

  async function startRoomScreenShare() {
    setActionError(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Your browser does not support screen sharing on this page.");
    }

    if (isSharingScreen && roomMediaMode === "screen") {
      pendingScreenTrackRef.current?.stop();
      pendingScreenTrackRef.current = null;
      setIsSharingScreen(false);
      setRoomMediaMode("idle");
      setCallState("idle");
      await sendStructuredMessage("Screen sharing stopped.", {
        kind: "call",
        title: "Screen share stopped",
        action: "screen-stopped",
        mode: "screen",
      });
      return;
    }

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    pendingScreenTrackRef.current?.stop();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = displayStream;
    pendingScreenTrackRef.current = displayStream.getVideoTracks()[0] || null;
    pendingScreenTrackRef.current?.addEventListener("ended", () => {
      setIsSharingScreen(false);
      setRoomMediaMode("idle");
      setCallState("idle");
    });
    attachStreamToVideo(localVideoRef.current, displayStream);
    setCallMode("video");
    setCallState("connected");
    setIsSharingScreen(true);
    setRoomMediaMode("screen");
    await sendStructuredMessage(
      `Screen sharing started with ${bandwidthMode} network mode.`,
      {
        kind: "call",
        title: "Screen share started",
        action: "screen-started",
        mode: "screen",
        quality: bandwidthMode,
        encrypted,
      },
    );
  }

  async function handleStartCall(mode: "voice" | "video" | "screen") {
    try {
      if (mode === "screen") {
        if (directRecipientId) {
          await toggleScreenShare();
        } else {
          await startRoomScreenShare();
        }
        return;
      }

      if (directRecipientId) {
        await startDirectCall(mode);
        return;
      }

      await startRoomMedia(mode);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The browser blocked this call action.");
      if (directRecipientId && activeCallIdRef.current) {
        await sendWebRTCSignal("Call setup failed", {
          kind: "call",
          title: "Call setup failed",
          action: "failed",
          callId: activeCallIdRef.current,
          mode: callModeRef.current,
          targetUserId: directRecipientId,
          note: error instanceof Error ? error.message : "Browser media permission was blocked.",
        }).catch(() => undefined);
      }
      await cleanupActiveCall(false);
    }
  }

  async function handlePublishPoll() {
    const options = pollOptions
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) return;
    await sendStructuredMessage(
      pollQuestion.trim(),
      {
        kind: "poll",
        title: "Live room poll",
        pollOptions: options,
        votes: Object.fromEntries(options.map((option) => [option, 0])),
      },
    );
  }

  async function handleReaction() {
    if (!reaction.trim()) return;
    await sendStructuredMessage(
      reaction.trim(),
      {
        kind: "reaction",
        title: "Reaction overlay",
      },
    );
  }

  async function handleInviteToRoom() {
    if (!inviteUserId.trim() || directRecipientId || activeRoom === "global") return;
    await inviteToRoom.mutateAsync({
      roomId: Number(activeRoom),
      userId: inviteUserId.trim(),
      role: "member",
    });
    setInviteUserId("");
  }

  async function handleTogglePermanentRoom() {
    if (directRecipientId || activeRoom === "global" || !activeRoomSettings) return;
    await updateRoomSettings.mutateAsync({
      roomId: Number(activeRoom),
      settings: {
        ...activeRoomSettings.settings,
        hasPermanentCall: !activeRoomSettings.settings.hasPermanentCall,
      },
    });
  }

  async function handleToggleRoomFlag(flag: "isPrivate" | "allowGuests") {
    if (directRecipientId || activeRoom === "global" || !activeRoomSettings) return;
    await updateRoomSettings.mutateAsync({
      roomId: Number(activeRoom),
      settings: {
        ...activeRoomSettings.settings,
        [flag]: !activeRoomSettings.settings[flag],
      },
    });
  }

  async function enableBrowserNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setBrowserNotificationsEnabled(permission === "granted");
  }

  function renderStructured(entry: (typeof enrichedMessages)[number]) {
    const meta = entry.meta;
    if (!meta) return null;

    if (meta.kind === "poll") {
      const options = meta.pollOptions || [];
      const votes = meta.votes || {};
      return (
        <div className="mt-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">{meta.title}</div>
          <div className="mt-2 space-y-2">
            {options.map((option) => {
              const value = votes[option] ?? 0;
              return (
                <div key={option}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>{option}</span>
                    <span>{value} votes</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600"
                      style={{ width: `${Math.min(100, 20 + value * 10)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (meta.kind === "guest") {
      return (
        <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs text-emerald-100">
          <div className="font-semibold">{meta.title}</div>
          <div className="mt-1 break-all text-emerald-200">{meta.link}</div>
        </div>
      );
    }

    if (meta.kind === "attachment" && meta.fileUrl) {
      const isImage = meta.attachmentKind === "image" || meta.mimeType?.startsWith("image/");
      return (
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/20 text-xs text-slate-200">
          {isImage ? (
            <a href={meta.fileUrl} target="_blank" rel="noreferrer" className="block">
              <img src={meta.fileUrl} alt={meta.fileName || "Uploaded photo"} className="max-h-80 w-full object-contain bg-black/30" />
            </a>
          ) : (
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-200">
                <Paperclip className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-white">{meta.fileName || "Uploaded file"}</div>
                <div className="mt-0.5 text-slate-500">{formatFileSize(meta.fileSize)} {meta.mimeType || ""}</div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-2">
            <span className="min-w-0 truncate text-slate-400">{meta.fileName || meta.title}</span>
            <a href={meta.fileUrl} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-cyan-200 hover:text-cyan-100">
              Open
            </a>
          </div>
        </div>
      );
    }

    if (meta.kind === "schedule" || meta.kind === "minutes" || meta.kind === "annotation") {
      return (
        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
          <div className="font-semibold text-white">{meta.title}</div>
          {meta.when && <div className="mt-1 text-slate-400">When: {meta.when}</div>}
          {meta.note && <div className="mt-2 whitespace-pre-wrap text-slate-300">{meta.note}</div>}
        </div>
      );
    }

    if (meta.kind === "jump") {
      return (
        <div className="mt-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-3 text-xs text-violet-100">
          <div className="font-semibold">{meta.title}</div>
          <div className="mt-1 text-violet-200">{meta.lineRef}</div>
        </div>
      );
    }

    if (
      meta.kind === "code-anchor" ||
      meta.kind === "handoff" ||
      meta.kind === "terminal-pip" ||
      meta.kind === "ai-summary" ||
      meta.kind === "action-item" ||
      meta.kind === "translation" ||
      meta.kind === "drawing" ||
      meta.kind === "replay"
    ) {
      return (
        <div className="mt-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3 text-xs text-cyan-100">
          <div className="font-semibold text-white">{meta.title}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {meta.lineRef && <Badge variant="outline" className="border-cyan-500/20 text-cyan-200">{meta.lineRef}</Badge>}
            {meta.command && <Badge variant="outline" className="border-emerald-500/20 text-emerald-200">{meta.command}</Badge>}
            {meta.languageName && <Badge variant="outline" className="border-violet-500/20 text-violet-200">{meta.languageName}</Badge>}
            {meta.assignee && <Badge variant="outline" className="border-white/10 text-slate-300">{meta.assignee}</Badge>}
            {meta.replayId && <Badge variant="outline" className="border-white/10 text-slate-300">Replay {meta.replayId.slice(0, 8)}</Badge>}
          </div>
          {meta.note && <div className="mt-2 whitespace-pre-wrap text-cyan-50">{meta.note}</div>}
        </div>
      );
    }

    if (meta.kind === "reaction") {
      return (
        <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-xs text-white">
          {entry.message.content}
        </div>
      );
    }

    if (meta.kind === "call" || meta.kind === "control" || meta.kind === "execution") {
      return (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-300">
          <div className="font-semibold text-white">{meta.title}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {meta.background && <Badge variant="outline" className="border-white/10 text-slate-300">{meta.background}</Badge>}
            {meta.quality && <Badge variant="outline" className="border-white/10 text-slate-300">{meta.quality}</Badge>}
            {typeof meta.encrypted === "boolean" && (
              <Badge variant="outline" className="border-white/10 text-slate-300">
                {meta.encrypted ? "Encrypted" : "Open"}
              </Badge>
            )}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-92px)] max-w-[1600px] flex-col gap-3 bg-[#070a10] bg-[linear-gradient(180deg,#0f1724_0%,#070a10_38%,#05070b_100%)] p-2 text-slate-100 lg:flex-row lg:gap-0 lg:p-0">
      {callState === "incoming" && incomingCall && (
        <div className="fixed inset-x-3 top-3 z-50 mx-auto max-w-xl rounded-3xl border border-amber-400/30 bg-[#111827] p-4 shadow-2xl shadow-black/40">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
              {incomingCall.mode === "video" ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">
                Incoming {incomingCall.mode} call
              </div>
              <div className="mt-1 truncate text-xs text-slate-400">
                {incomingCallerName} is calling you. The ringtone will stop when you answer or decline.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => void acceptIncomingCall()}>
                  <Phone className="mr-2 h-4 w-4" />
                  Answer
                </Button>
                <Button variant="ghost" className="border border-white/10 text-slate-200 hover:bg-white/10" onClick={() => void rejectIncomingCall()}>
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Card className="w-full shrink-0 gap-0 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f17]/95 p-0 shadow-2xl shadow-black/30 lg:w-[22rem] lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r">
        <div className="border-b border-white/10 bg-[#0f1622] px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">OCNE collaboration</div>
              <div className="mt-1 flex items-center gap-2 text-base font-semibold text-white">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
                Chat
              </div>
            </div>
            <Badge className="border-0 bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
              <Wifi className="mr-1 h-3 w-3" />
              Live
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2 shadow-sm shadow-black/20">
              <div className="text-base font-semibold text-white">{(rooms || []).length + 1}</div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Rooms</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2 shadow-sm shadow-black/20">
              <div className="text-base font-semibold text-white">{threadOptions.length}</div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">DMs</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2 shadow-sm shadow-black/20">
              <div className="text-base font-semibold text-white">{participants.length}</div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Live</div>
            </div>
          </div>
        </div>

        <div className="max-h-[460px] overflow-y-auto lg:max-h-none">
          <div className="space-y-5 p-3">
            <div className="space-y-3 rounded-2xl border border-cyan-500/15 bg-[#101722] p-3 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Create room</div>
                  <div className="text-[11px] text-slate-500">Start a public Space or invite-only room.</div>
                </div>
                <Plus className="h-4 w-4 text-cyan-300" />
              </div>
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="War room / sprint room"
                className="h-11 rounded-full border-white/10 bg-[#070a10] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`rounded-full border text-xs ${
                    newRoomPrivacy === "public"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                      : "border-white/10 text-slate-300"
                  }`}
                  onClick={() => setNewRoomPrivacy("public")}
                >
                  <Globe className="mr-1.5 h-3.5 w-3.5" />
                  Public
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`rounded-full border text-xs ${
                    newRoomPrivacy === "private"
                      ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                      : "border-white/10 text-slate-300"
                  }`}
                  onClick={() => setNewRoomPrivacy("private")}
                >
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Private
                </Button>
              </div>
              <Input
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder="Search people to invite"
                className="h-11 rounded-full border-white/10 bg-[#070a10] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
              />
              <div className="max-h-40 space-y-1 overflow-auto rounded-2xl border border-white/10 bg-[#070a10] p-1">
                {inviteCandidates.length === 0 && (
                  <div className="px-2 py-2 text-xs text-slate-500">No people found yet.</div>
                )}
                {inviteCandidates.map((candidate) => {
                  const id = String(candidate.id);
                  const selected = selectedInviteIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleInvitee(id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        selected ? "bg-cyan-500/15 text-cyan-100" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <span className="truncate">{candidate.name || candidate.username || id}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-[0.12em]">
                        {selected ? "Invited" : candidate.status || "user"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedInvitees.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedInvitees.map((candidate) => (
                    <Badge key={candidate!.id} variant="outline" className="border-cyan-500/20 text-cyan-200">
                      {candidate!.name || candidate!.username}
                    </Badge>
                  ))}
                </div>
              )}
              <Button onClick={handleCreateRoom} disabled={!newRoomName.trim() || createRoom.isPending} className="h-11 w-full rounded-full bg-white text-black hover:bg-slate-200">
                <Plus className="mr-2 h-4 w-4" />
                Create {newRoomPrivacy} room
              </Button>
            </div>

            <div>
              <div className="flex items-center justify-between px-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-600">Rooms</div>
                <Badge variant="outline" className="h-5 border-white/10 px-1.5 text-[10px] text-slate-400">
                  {(rooms || []).length + 1}
                </Badge>
              </div>
              <div className="mt-2 space-y-1.5">
                <button
                  onClick={() => openRoom("global")}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                    activeRoom === "global"
                      ? "border-cyan-500/30 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10"
                      : "border-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">Global War Room</div>
                    <div className="text-[11px] text-slate-500">Open team channel</div>
                  </div>
                </button>

                {(rooms || []).map((room) => (
                  <button
                    key={room.id}
                    onClick={() => openRoom(String(room.id))}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                      activeRoom === String(room.id)
                        ? "border-cyan-500/30 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10"
                        : "border-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{room.name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        {room.settings?.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        <span>{room.creator?.name || room.creator?.username || "Room creator"}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between px-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-600">Public Spaces</div>
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="mt-2 space-y-1.5">
                {(publicRooms || []).length === 0 && (
                  <div className="rounded-xl border border-white/5 bg-black/15 px-3 py-3 text-xs text-slate-500">
                    No public rooms waiting to join.
                  </div>
                )}
                {(publicRooms || []).map((room) => (
                  <div key={room.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 shadow-sm shadow-black/20">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                        <Radio className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-200">{room.name}</div>
                        <div className="truncate text-[11px] text-slate-500">
                          Created by {room.creator?.name || room.creator?.username || "Unknown user"}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-9 w-full rounded-full border border-white/10 text-slate-100 hover:bg-white/10"
                      onClick={() => void handleJoinPublicRoom(Number(room.id))}
                      disabled={joinRoom.isPending}
                    >
                      Join room
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between px-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-600">Direct Messages</div>
                <Phone className="h-3.5 w-3.5 text-violet-300" />
              </div>
              <Input
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder="Search people or message preview..."
                className="mt-2 h-11 rounded-full border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
              />
              <div className="mt-2 space-y-1.5">
                {threadOptions.length === 0 && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 text-xs text-slate-500">
                    No accepted friends yet.
                  </div>
                )}
                {threadOptions.map((thread) => {
                  const active = String(directRecipientId) === String(thread.id);
                  return (
                    <button
                      key={thread.id}
                      onClick={() => openDirectMessage(thread.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                        active
                          ? "border-cyan-500/30 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10"
                          : "border-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={thread.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-600 text-[10px] text-white">
                          {(thread.label || "U").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium">{thread.label}</div>
                          {thread.unreadCount > 0 && (
                            <Badge className="border-0 bg-amber-500/20 text-[10px] text-amber-200">
                              {thread.unreadCount}
                            </Badge>
                          )}
                          {thread.isFriend && (
                            <Badge className="border-0 bg-emerald-500/15 text-[10px] text-emerald-300">
                              Friend
                            </Badge>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {thread.preview}
                        </div>
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                        {thread.status}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-sm shadow-black/20">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white">Alerts</div>
                <Bell className="h-4 w-4 text-amber-300" />
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-slate-300">
                {notificationUnread?.length || 0} unread notifications across direct calls, DMs, and room invites.
              </div>
              <Button
                variant="ghost"
                className="w-full rounded-full border border-white/10 text-slate-100 hover:bg-white/10"
                onClick={() => void enableBrowserNotifications()}
              >
                <Bell className="mr-2 h-4 w-4" />
                {browserNotificationsEnabled ? "Browser alerts enabled" : "Enable browser alerts"}
              </Button>
            </div>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-sm shadow-black/20">
              <div className="text-xs font-semibold text-white">Breakout rooms</div>
              <Input
                value={breakoutName}
                onChange={(e) => setBreakoutName(e.target.value)}
                placeholder="Frontend / Backend / QA"
                className="h-11 rounded-full border-white/10 bg-[#070a10] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
              />
              <Button onClick={handleCreateBreakout} disabled={!breakoutName.trim() || createRoom.isPending} variant="ghost" className="h-11 w-full rounded-full border border-white/10 text-slate-200 hover:bg-white/10">
                <Users className="mr-2 h-4 w-4" />
                Create breakout
              </Button>
            </div>

            <div>
              <div className="px-2 text-[10px] uppercase tracking-[0.2em] text-slate-600">
                Participants ({participants.length})
              </div>
              <div className="mt-2 space-y-1.5">
                {participants.slice(0, 8).map((participant) => {
                  const active = participant?.id === speakerId;
                  return (
                    <div key={participant?.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${active ? "bg-emerald-500/8" : "bg-white/[0.02]"}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant?.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-[10px] text-white">
                          {(participant?.name || participant?.username || "U").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-slate-200">
                          {participant?.name || participant?.username}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {active ? "Active talker highlighted" : "Ready in room"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="min-w-0 flex-1">
        <Card className="min-h-full gap-0 overflow-visible rounded-3xl border border-white/10 bg-[#080b12] p-0 shadow-2xl shadow-black/30 lg:rounded-none lg:border-y-0 lg:border-r-0">
          <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0f17]/96 px-3 py-3 shadow-lg shadow-black/20 backdrop-blur sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-11 w-11 shrink-0 border border-white/10 sm:h-12 sm:w-12">
                  <AvatarImage src={currentDirectUser?.avatar || activeRoomCreator?.avatar || undefined} />
                  <AvatarFallback className="bg-[#1d9bf0] text-white">
                    {(roomName || "R").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-white sm:text-xl">{roomName}</h2>
                    <Badge className={`rounded-full border-0 ${directRecipientId ? "bg-[#1d9bf0]/15 text-[#8ecdf8]" : "bg-emerald-500/15 text-emerald-300"}`}>
                      {directRecipientId ? "Direct message" : "Always-on"}
                    </Badge>
                    {!directRecipientId && (
                      <Badge variant="outline" className="border-white/10 text-slate-300">
                        {encrypted ? "E2E encrypted" : "Open media"}
                      </Badge>
                    )}
                    {!directRecipientId && activeRoomSettings?.settings?.hasPermanentCall && (
                      <Badge variant="outline" className="border-cyan-500/20 text-cyan-200">
                        Permanent call
                      </Badge>
                    )}
                    {!directRecipientId && activeRoomSettings?.settings?.isPrivate && (
                      <Badge variant="outline" className="border-violet-500/20 text-violet-200">
                        Private room
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 max-w-3xl truncate text-xs text-slate-500">
                    {directRecipientId
                      ? `Private one-to-one conversation with ${currentDirectUser?.name || currentDirectUser?.username || "this person"}.`
                      : activeRoom === "global"
                        ? "Calls, code sharing, transcripts, minutes, breakout work, and secure guest access all flow through this room."
                        : `Created by ${activeRoomCreator?.name || activeRoomCreator?.username || activeRoomRecord?.createdBy || "unknown user"}. Calls, members, privacy, and guest access are controlled here.`}
                  </p>
                </div>
              </div>

              {!directRecipientId ? (
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap">
                  <Button size="sm" className="rounded-full bg-white text-black hover:bg-slate-200" onClick={() => handleStartCall("voice")}>
                    <Phone className="mr-2 h-4 w-4" />
                    {roomMediaMode === "voice" ? "Voice On" : "Voice"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200 hover:bg-white/[0.06]" onClick={() => handleStartCall("video")}>
                    <Video className="mr-2 h-4 w-4" />
                    {roomMediaMode === "video" ? "Video On" : "Video"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200 hover:bg-white/[0.06]" onClick={() => handleStartCall("screen")}>
                    <ScreenShare className="mr-2 h-4 w-4" />
                    {roomMediaMode === "screen" ? "Stop Share" : "Share Screen"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200 hover:bg-white/[0.06]" onClick={handleRemoteControl}>
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Remote Control
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200 hover:bg-white/[0.06]" onClick={handleSendGuestLink}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Guest Link
                  </Button>
                  {roomMediaMode !== "idle" && (
                    <Button size="sm" variant="ghost" className="rounded-full border border-red-500/20 text-red-200 hover:bg-red-500/10" onClick={() => void cleanupActiveCall(false)}>
                      <PhoneOff className="mr-2 h-4 w-4" />
                      End
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap">
                  <Button size="sm" className="rounded-full bg-white text-black hover:bg-slate-200" onClick={() => handleStartCall("voice")} disabled={!canCallCurrentDirectUser}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call this person
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200 hover:bg-white/[0.06]" onClick={() => handleStartCall("video")} disabled={!canCallCurrentDirectUser}>
                    <Video className="mr-2 h-4 w-4" />
                    Video call
                  </Button>
                  {(callState === "connected" || callState === "connecting" || callState === "outgoing") && (
                    <>
                      <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200 hover:bg-white/[0.06]" onClick={() => handleStartCall("screen")}>
                        <ScreenShare className="mr-2 h-4 w-4" />
                        {isSharingScreen ? "Stop share" : "Share screen"}
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200 hover:bg-white/[0.06]" onClick={handleRemoteControl}>
                        <Maximize2 className="mr-2 h-4 w-4" />
                        Remote Control
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-full border border-red-500/20 text-red-200 hover:bg-red-500/10" onClick={() => void cleanupActiveCall(true)}>
                        <PhoneOff className="mr-2 h-4 w-4" />
                        Hang up
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200 hover:bg-white/[0.06]" onClick={handleSendGuestLink}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Guest Link
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Status</div>
                <div className="mt-1 truncate text-sm font-semibold text-white">{roomStatusLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">People</div>
                <div className="mt-1 text-sm font-semibold text-white">{participants.length} active</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Call</div>
                <div className="mt-1 truncate text-sm font-semibold text-white">{activeCallLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Latest message</div>
                <div className="mt-1 truncate text-sm font-semibold text-white">{latestMessageLabel}</div>
              </div>
            </div>

            {!directRecipientId && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
                <Badge variant="outline" className="justify-center rounded-full border-white/10 bg-white/[0.04] py-1.5 text-slate-300">{recording ? "Recording on" : "Recording off"}</Badge>
                <Badge variant="outline" className="justify-center rounded-full border-white/10 bg-white/[0.04] py-1.5 text-slate-300">{noiseCancel ? "Noise cancellation" : "Raw audio"}</Badge>
                <Badge variant="outline" className="justify-center rounded-full border-white/10 bg-white/[0.04] py-1.5 text-slate-300">{backgroundBlur ? "Background blur" : "Clear background"}</Badge>
                <Badge variant="outline" className="justify-center rounded-full border-white/10 bg-white/[0.04] py-1.5 text-slate-300">{pipMode ? "PiP enabled" : "PiP hidden"}</Badge>
                <Badge variant="outline" className="justify-center rounded-full border-white/10 bg-white/[0.04] py-1.5 text-slate-300">{bandwidthMode}</Badge>
                <Badge variant="outline" className="justify-center rounded-full border-white/10 bg-white/[0.04] py-1.5 text-slate-300">{callBackground}</Badge>
              </div>
            )}
            {actionError && (
              <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                {actionError}
              </div>
            )}
          </div>

          <div className="grid gap-0 2xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="flex flex-col gap-4 border-t border-white/10 bg-[#080b12] p-3 sm:p-4 lg:border-l 2xl:border-t-0">
              <div className="order-2 grid gap-4 2xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-white/10 bg-[#0d121b] p-3 shadow-lg shadow-black/20 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Meeting controls</div>
                      <div className="text-[11px] text-slate-500">Call, recording, sharing, and room automation controls.</div>
                    </div>
                    <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 2xl:grid-cols-2">
                    <Button variant="ghost" className={meetingControlButtonClass} onClick={() => void handleToggleRecording()}>
                      <Mic className="mr-2 h-4 w-4" />
                      <span className="min-w-0 break-words">{recording ? "Stop recording" : "Start recording"}</span>
                    </Button>
                    <Button variant="ghost" className={meetingControlButtonClass} onClick={() => void handleTogglePip()}>
                      <PictureInPicture2 className="mr-2 h-4 w-4" />
                      <span className="min-w-0 break-words">{pipMode ? "Disable PiP" : "Enable PiP"}</span>
                    </Button>
                    <Button variant="ghost" className={meetingControlButtonClass} onClick={handleToggleNoiseCancel}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span className="min-w-0 break-words">{noiseCancel ? "Disable noise cancel" : "Enable noise cancel"}</span>
                    </Button>
                    <Button variant="ghost" className={meetingControlButtonClass} onClick={() => setBackgroundBlur((v) => !v)}>
                      <WandSparkles className="mr-2 h-4 w-4" />
                      <span className="min-w-0 break-words">{backgroundBlur ? "Disable blur" : "Enable blur"}</span>
                    </Button>
                    <Button variant="ghost" className={meetingControlButtonClass} onClick={handleToggleEncrypted}>
                      <Lock className="mr-2 h-4 w-4" />
                      <span className="min-w-0 break-words">{encrypted ? "Disable E2E" : "Enable E2E"}</span>
                    </Button>
                    <Button variant="ghost" className={meetingControlButtonClass} onClick={handleRunInBackground}>
                      <Play className="mr-2 h-4 w-4" />
                      <span className="min-w-0 break-words">Background execution</span>
                    </Button>
                  </div>
                  {roomMediaMode !== "idle" && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-lg shadow-black/20">
                      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {roomMediaMode === "screen" ? "Screen share" : `${roomMediaMode} call`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {roomMediaMode === "voice"
                              ? "Microphone is live in this room."
                              : "Local preview is active for this room."}
                          </div>
                        </div>
                        <Badge className="border-0 bg-emerald-500/15 text-emerald-300">Live</Badge>
                      </div>
                      {roomMediaMode === "voice" ? (
                        <div className="flex min-h-[120px] items-center justify-center bg-black text-sm text-slate-400">
                          Voice call active
                        </div>
                      ) : (
                        <div className={`relative flex aspect-video items-center justify-center ${callBackgroundClass}`}>
                          <video ref={localVideoRef} autoPlay muted playsInline className={localVideoClassName} />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
                        <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200" onClick={toggleMute}>
                          <Mic className="mr-2 h-4 w-4" />
                          {isMuted ? "Unmute" : "Mute"}
                        </Button>
                        {roomMediaMode === "video" && (
                          <Button size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200" onClick={toggleCamera}>
                            <Video className="mr-2 h-4 w-4" />
                            {isCameraOff ? "Camera on" : "Camera off"}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="rounded-full border border-red-500/20 text-red-200" onClick={() => void cleanupActiveCall(false)}>
                          <PhoneOff className="mr-2 h-4 w-4" />
                          End
                        </Button>
                      </div>
                    </div>
                  )}
                  {recordedClipUrl && (
                    <a
                      href={recordedClipUrl}
                      download={recordedClipName}
                      className="mt-3 flex h-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-sm font-medium text-emerald-200 hover:bg-emerald-500/15"
                    >
                      Download latest recording
                    </a>
                  )}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">Bandwidth mode</div>
                      <div className="grid grid-cols-1 gap-2">
                        {["adaptive", "quality", "bandwidth"].map((mode) => (
                          <Button
                            key={mode}
                            size="sm"
                            variant={bandwidthMode === mode ? "default" : "ghost"}
                            onClick={() => handleBandwidthMode(mode)}
                            className={`${meetingOptionButtonClass} ${bandwidthMode === mode ? "bg-cyan-500 text-slate-950" : "text-slate-300"}`}
                          >
                            <Wifi className="mr-2 h-4 w-4" />
                            <span className="min-w-0 break-words">{mode}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">Call background</div>
                      <div className="grid grid-cols-1 gap-2">
                        {["Nebula IDE", "Terminal Dark", "Graph Paper"].map((bg) => (
                          <Button
                            key={bg}
                            size="sm"
                            variant={callBackground === bg ? "default" : "ghost"}
                            onClick={() => {
                              setCallBackground(bg);
                              setActionError(`${bg} background applied to the call preview.`);
                            }}
                            className={`${meetingOptionButtonClass} ${callBackground === bg ? "bg-cyan-500 text-slate-950" : "text-slate-300"}`}
                          >
                            <span className="min-w-0 break-words">{bg}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0d121b] p-3 shadow-lg shadow-black/20 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Live transcript</div>
                      <div className="text-[11px] text-slate-500">Searchable and used for auto minutes.</div>
                    </div>
                    <ScanSearch className="h-4 w-4 text-cyan-400" />
                  </div>
                  <Input
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search transcript..."
                    className="mt-3 border-white/10 bg-white/[0.04] text-white focus-visible:ring-cyan-500/40"
                  />
                  <ScrollArea className="mt-3 h-[220px] rounded-xl border border-white/10 bg-[#080b12] p-3">
                    <div className="space-y-3">
                      {transcriptEntries.length === 0 && (
                        <div className="text-sm text-slate-500">No transcript matches yet.</div>
                      )}
                      {transcriptEntries.map((entry) => (
                        <div key={entry.message.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{entry.sender?.name || entry.sender?.username || "User"}</span>
                            <span>{new Date(entry.message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="mt-1 text-sm text-slate-200">{entry.message.content}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-3 grid gap-2 sm:flex">
                    <Button onClick={handlePublishMinutes} className="bg-cyan-500 text-slate-950">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Publish minutes
                    </Button>
                    <Button variant="ghost" className="border border-white/10 text-slate-200" onClick={handleReaction}>
                      <Radio className="mr-2 h-4 w-4" />
                      Push reaction
                    </Button>
                  </div>
                  {latestMinutes && (
                    <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-3 text-sm text-violet-100">
                      <div className="font-semibold">Latest minutes</div>
                      <div className="mt-2 whitespace-pre-wrap text-violet-50">{latestMinutes.message.content}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="order-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17] shadow-xl shadow-black/25">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#101722] px-3 py-3 sm:px-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{directRecipientId ? "Private conversation" : "Room conversation"}</div>
                    <div className="text-[11px] text-slate-500">
                      Messages, files, call notes, polls, and code context stay together here.
                    </div>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {participants.length} active
                  </Badge>
                </div>
                <ScrollArea className="h-[58vh] min-h-[380px] bg-[#080b12] px-3 py-4 sm:px-4 lg:h-[560px]">
                  <div className="space-y-4">
                    {messageSearch.trim().length > 1 && (
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-3 text-xs text-cyan-100">
                        Showing search results for "{messageSearch.trim()}" in this {directRecipientId ? "private thread" : "room"}.
                      </div>
                    )}
                    {streamEntries.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
                        <MessageSquare className="mx-auto h-8 w-8 text-slate-600" />
                        <p className="mt-3 text-sm text-slate-500">
                          {messageSearch.trim().length > 1
                            ? "No messages matched this search yet."
                            : "Start the room with a snippet, guest link, poll, or meeting note."}
                        </p>
                      </div>
                    )}
                    {streamEntries.map((entry) => {
                      const isMe = String(entry.message.senderId) === String(user?.id);
                      const isSpeaker = entry.sender?.id === speakerId;
                      return (
                        <div key={entry.message.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                          <Avatar className="h-10 w-10 flex-shrink-0 border border-white/10">
                            <AvatarImage src={entry.sender?.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-[10px] text-white">
                              {(entry.sender?.name || entry.sender?.username || "U").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="max-w-[min(82%,42rem)]">
                            <div className={`mb-1 flex items-center gap-2 text-[11px] text-slate-500 ${isMe ? "justify-end" : ""}`}>
                              {!isMe && <span>{entry.sender?.name || entry.sender?.username || "User"}</span>}
                              {isSpeaker && <Badge className="border-0 bg-emerald-500/15 text-[10px] text-emerald-300">Speaker</Badge>}
                              <span>{new Date(entry.message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-md ${
                              isMe
                                ? "border-cyan-400/30 bg-cyan-400 text-slate-950 shadow-cyan-500/10"
                                : "border-white/10 bg-[#111827] text-slate-100 shadow-black/20"
                            }`}>
                              <div className="whitespace-pre-wrap break-words">{entry.message.content}</div>
                              {renderStructured(entry)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>
                <div className="border-t border-white/10 bg-[#0b0f17] px-3 py-4 sm:px-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Input
                      value={messageSearch}
                      onChange={(e) => setMessageSearch(e.target.value)}
                      placeholder={directRecipientId ? "Search this private thread..." : "Search this room history..."}
                      className="h-10 max-w-sm rounded-full border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
                    />
                    {messageSearch.trim().length > 0 && (
                      <Button
                        variant="ghost"
                        className="rounded-full border border-white/10 text-slate-200 hover:bg-white/[0.06]"
                        onClick={() => setMessageSearch("")}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                  {typingLabel && (
                    <div className="mb-3 text-xs text-cyan-300">{typingLabel}</div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files) {
                        void uploadAndSendFiles(event.target.files);
                      }
                      event.target.value = "";
                    }}
                  />
                  <input
                    ref={photoInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files) {
                        void uploadAndSendFiles(event.target.files);
                      }
                      event.target.value = "";
                    }}
                  />
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-inner shadow-black/20 focus-within:border-cyan-400/40">
                    <div className="mb-2 flex items-center justify-between gap-3 px-1">
                      <span className="text-xs font-semibold text-slate-300">Write a message</span>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
                        {directRecipientId ? "Private" : "Room"}
                      </span>
                    </div>
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={directRecipientId ? `Message ${roomName}...` : "Message the room, paste code, share context, or post a call update..."}
                      className="min-h-[88px] resize-none border-0 bg-transparent text-white placeholder:text-slate-600 focus-visible:ring-0"
                    />
                  </div>
                  <div className="mt-3 grid gap-3 sm:flex sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full border border-white/10 text-slate-300 hover:bg-white/[0.06]"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAttachment}
                      >
                        <Paperclip className="mr-2 h-4 w-4" />
                        File
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full border border-white/10 text-slate-300 hover:bg-white/[0.06]"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploadingAttachment}
                      >
                        <Image className="mr-2 h-4 w-4" />
                        Photo
                      </Button>
                      {["++1", "ship it", "need review"].map((emoji) => (
                        <Button key={emoji} size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-300 hover:bg-white/[0.06]" onClick={() => setReaction(emoji)}>
                          {emoji}
                        </Button>
                      ))}
                    </div>
                    <Button onClick={handleSend} disabled={!messageText.trim() || sendMessage.isPending} className="min-h-10 rounded-full bg-cyan-400 px-5 text-slate-950 hover:bg-cyan-300">
                      <Send className="mr-2 h-4 w-4" />
                      {isUploadingAttachment ? "Uploading..." : "Send"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-white/10 p-3 sm:p-4 2xl:border-l 2xl:border-t-0">
              {!directRecipientId && activeRoom !== "global" && (
                <Card className="rounded-3xl border-white/10 bg-[#0d121b] p-4 shadow-lg shadow-black/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Room administration</div>
                      <div className="text-[11px] text-slate-500">
                        Created by {activeRoomCreator?.name || activeRoomCreator?.username || activeRoomRecord?.createdBy || "unknown user"}.
                        {canManageActiveRoom ? " You can manage this room." : " Only the creator/admins can change settings."}
                      </div>
                    </div>
                    <Settings2 className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-white/10 text-slate-300">
                          {activeRoomSettings?.settings?.isPrivate ? "Private" : "Open to members"}
                        </Badge>
                        <Badge variant="outline" className="border-white/10 text-slate-300">
                          {activeRoomSettings?.settings?.allowGuests ? "Guests allowed" : "Guests restricted"}
                        </Badge>
                        <Badge variant="outline" className="border-white/10 text-slate-300">
                          {activeRoomSettings?.settings?.hasPermanentCall ? "War room pinned live" : "On-demand calls"}
                        </Badge>
                        <Badge variant="outline" className="border-white/10 text-slate-300">
                          {roomMembers?.length || 0} members
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={inviteUserId}
                        onChange={(e) => setInviteUserId(e.target.value)}
                        placeholder="User ID to invite"
                        className="h-11 rounded-full border-white/10 bg-[#070a10] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
                      />
                      <Button
                        onClick={() => void handleInviteToRoom()}
                        disabled={!canManageActiveRoom || !inviteUserId.trim() || inviteToRoom.isPending}
                        className="bg-cyan-500 text-slate-950"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      className="justify-start rounded-full border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
                      onClick={() => void handleTogglePermanentRoom()}
                      disabled={!canManageActiveRoom || !activeRoomSettings || updateRoomSettings.isPending}
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      {activeRoomSettings?.settings?.hasPermanentCall ? "Disable permanent call" : "Enable permanent call"}
                    </Button>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="ghost"
                        className="justify-start rounded-full border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
                        onClick={() => void handleToggleRoomFlag("isPrivate")}
                        disabled={!canManageActiveRoom || !activeRoomSettings || updateRoomSettings.isPending}
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        {activeRoomSettings?.settings?.isPrivate ? "Make room member-visible" : "Make room private"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start rounded-full border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
                        onClick={() => void handleToggleRoomFlag("allowGuests")}
                        disabled={!canManageActiveRoom || !activeRoomSettings || updateRoomSettings.isPending}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        {activeRoomSettings?.settings?.allowGuests ? "Disable guest access" : "Allow guest access"}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {directRecipientId && (
                <Card className="rounded-3xl border-white/10 bg-[#0d121b] p-4 shadow-lg shadow-black/20">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">Private chat tools</div>
                    <Users className="h-4 w-4 text-violet-300" />
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-400">
                    {canCallCurrentDirectUser
                      ? `This thread is only between you and ${roomName}. You can make voice and video calls because you are friends.`
                      : "Accept the friend request first to unlock private messages, voice calls, and video calls."}
                  </div>
                  <div className="mt-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">Call readiness</div>
                        <div className="mt-1 text-xs leading-5 text-cyan-50/75">{callHealthMessage}</div>
                      </div>
                      <Button size="sm" className="rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={() => void enableCallAlerts()}>
                        <Bell className="mr-2 h-4 w-4" />
                        Enable call alerts
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Badge variant="outline" className="justify-center border-white/10 py-1 text-cyan-100">
                        {currentDirectUserOnline ? "Receiver online" : "Receiver may be offline"}
                      </Badge>
                      <Badge variant="outline" className="justify-center border-white/10 py-1 text-cyan-100">
                        Notifications: {notificationPermission}
                      </Badge>
                      <Badge variant="outline" className="justify-center border-white/10 py-1 text-cyan-100">
                        Ringtone: {callSoundsReady ? "ready" : "needs click"}
                      </Badge>
                      <Badge variant="outline" className="justify-center border-white/10 py-1 text-cyan-100">
                        Relay: {turnRelayConfigured ? "TURN configured" : "STUN only"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      className="bg-violet-500 text-white"
                      onClick={() => handleStartCall("voice")}
                      disabled={!canCallCurrentDirectUser || callState !== "idle"}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Voice call
                    </Button>
                    <Button
                      variant="ghost"
                      className="border border-white/10 text-slate-200"
                      onClick={() => handleStartCall("video")}
                      disabled={!canCallCurrentDirectUser || callState !== "idle"}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Video call
                    </Button>
                    {(callState === "connected" || callState === "connecting" || callState === "outgoing") && (
                      <Button
                        variant="ghost"
                        className="border border-white/10 text-slate-200"
                        onClick={() => void cleanupActiveCall(true)}
                      >
                        <PhoneOff className="mr-2 h-4 w-4" />
                        Hang up
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#080b12] p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">Direct call state</div>
                        <div className="text-[11px] text-slate-500">
                          {callState === "idle" && "No active direct call"}
                          {callState === "outgoing" && "Calling teammate..."}
                          {callState === "incoming" && "Incoming call request"}
                          {callState === "connecting" && "Negotiating peer connection"}
                          {callState === "connected" && "Connected"}
                        </div>
                      </div>
                      <Badge
                        className={`border-0 ${
                          callState === "connected"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : callState === "incoming"
                              ? "bg-amber-500/15 text-amber-200"
                              : "bg-white/10 text-slate-200"
                        }`}
                      >
                        {callMode}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">ICE</div>
                        <div className="mt-1 text-sm font-semibold text-white">{iceConnectionState}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Peer</div>
                        <div className="mt-1 text-sm font-semibold text-white">{peerConnectionState}</div>
                      </div>
                    </div>

                    {callState === "incoming" && incomingCall && (
                      <div className="mt-3 flex gap-2">
                        <Button className="bg-emerald-500 text-slate-950" onClick={() => void acceptIncomingCall()}>
                          Accept
                        </Button>
                        <Button variant="ghost" className="border border-white/10 text-slate-200" onClick={() => void rejectIncomingCall()}>
                          Decline
                        </Button>
                      </div>
                    )}

                    {recentCallHistory.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
                        <div className="mb-2 text-xs font-semibold text-white">Recent call history</div>
                        <div className="space-y-2">
                          {recentCallHistory.slice(0, 4).map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="truncate text-slate-200">{item.direction} {item.mode} with {item.label}</div>
                                <div className="text-slate-600">{new Date(item.createdAt).toLocaleString()}</div>
                              </div>
                              <Badge variant="outline" className="shrink-0 border-white/10 text-slate-300">{item.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f1624]">
                        <div className="border-b border-white/5 px-3 py-2 text-xs font-medium text-slate-300">
                          You
                        </div>
                        <div className={`relative flex aspect-video items-center justify-center ${callBackgroundClass}`}>
                          <video ref={localVideoRef} autoPlay muted playsInline className={localVideoClassName} />
                          {!hasLocalStream && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                              Local media preview
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f1624]">
                        <div className="border-b border-white/5 px-3 py-2 text-xs font-medium text-slate-300">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>{roomName}</span>
                            <span className="text-[10px] text-slate-500">
                              {remoteMediaState.muted ? "Muted" : "Mic on"} / {remoteMediaState.cameraOff ? "Camera off" : "Camera on"}
                            </span>
                          </div>
                        </div>
                        <div className={`relative flex aspect-video items-center justify-center ${callBackgroundClass}`}>
                          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                          {!hasRemoteStream && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                              Waiting for remote media
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {(callState === "connected" || callState === "connecting") && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="ghost" className="border border-white/10 text-slate-200" onClick={toggleMute}>
                          <Mic className="mr-2 h-4 w-4" />
                          {isMuted ? "Unmute" : "Mute"}
                        </Button>
                        <Button
                          variant="ghost"
                          className="border border-white/10 text-slate-200"
                          onClick={toggleCamera}
                          disabled={callMode === "voice"}
                        >
                          <Video className="mr-2 h-4 w-4" />
                          {isCameraOff ? "Camera on" : "Camera off"}
                        </Button>
                        <Button
                          variant="ghost"
                          className="border border-white/10 text-slate-200"
                          onClick={() => void toggleScreenShare()}
                          disabled={callMode === "voice"}
                        >
                          <ScreenShare className="mr-2 h-4 w-4" />
                          {isSharingScreen ? "Stop share" : "Share screen"}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )}
              <Card className="rounded-3xl border-cyan-500/20 bg-[#07111d] p-4 shadow-xl shadow-cyan-950/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Code-aware call layer</div>
                    <div className="text-[11px] text-slate-500">Tie voice, video, terminal, AI notes, and replay markers to code context.</div>
                  </div>
                  <MonitorUp className="h-4 w-4 text-cyan-300" />
                </div>

                <div className="mt-3 grid gap-3">
                  <Input
                    value={callCodeAnchor}
                    onChange={(e) => setCallCodeAnchor(e.target.value)}
                    placeholder="src/pages/EditorPage.tsx:120"
                    className="h-11 rounded-full border-white/10 bg-[#080b12] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button onClick={handlePinCallToCode} variant="ghost" className="justify-start rounded-full border border-cyan-500/20 text-cyan-100 hover:bg-cyan-500/10">
                      <Link2 className="mr-2 h-4 w-4" />
                      Pin call to code
                    </Button>
                    <Button onClick={handleRequestHandoff} variant="ghost" className="justify-start rounded-full border border-violet-500/20 text-violet-100 hover:bg-violet-500/10">
                      <Maximize2 className="mr-2 h-4 w-4" />
                      Request handoff
                    </Button>
                  </div>

                  <Input
                    value={terminalShareCommand}
                    onChange={(e) => setTerminalShareCommand(e.target.value)}
                    placeholder="npm run build"
                    className="h-11 rounded-full border-white/10 bg-[#080b12] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
                  />
                  <Button onClick={handleShareTerminalPip} variant="ghost" className="justify-start rounded-full border border-emerald-500/20 text-emerald-100 hover:bg-emerald-500/10">
                    <PictureInPicture2 className="mr-2 h-4 w-4" />
                    Share terminal PiP
                  </Button>

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      value={captionLanguage}
                      onChange={(e) => setCaptionLanguage(e.target.value)}
                      placeholder="Caption language"
                      className="h-11 rounded-full border-white/10 bg-[#080b12] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
                    />
                    <Button onClick={handleEnableTranslatedCaptions} variant="ghost" className="rounded-full border border-white/10 text-slate-200 hover:bg-white/10">
                      Live captions
                    </Button>
                  </div>

                  <Textarea
                    value={actionItemText}
                    onChange={(e) => setActionItemText(e.target.value)}
                    placeholder="AI action item detected from the call..."
                    className="min-h-20 border-white/10 bg-[#080b12] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button onClick={handleCreateAiMeetingSummary} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI summary
                    </Button>
                    <Button onClick={handleCreateActionItem} variant="ghost" className="border border-white/10 text-slate-200 hover:bg-white/10">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Add action item
                    </Button>
                  </div>

                  <Input
                    value={drawingTarget}
                    onChange={(e) => setDrawingTarget(e.target.value)}
                    placeholder="active editor selection"
                    className="h-11 rounded-full border-white/10 bg-[#080b12] text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/40"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button onClick={handleStartDrawingOverlay} variant="ghost" className="justify-start rounded-full border border-amber-500/20 text-amber-100 hover:bg-amber-500/10">
                      <WandSparkles className="mr-2 h-4 w-4" />
                      Draw overlay
                    </Button>
                    <Button onClick={handleCreateSyncedReplay} variant="ghost" className="justify-start rounded-full border border-white/10 text-slate-200 hover:bg-white/10">
                      <Play className="mr-2 h-4 w-4" />
                      Save replay marker
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-slate-400">
                    SFU mode, bandwidth priority, spatial audio, and desktop-agent media routing are tracked here as structured events; the next backend step is connecting these controls to a real media service.
                  </div>
                </div>
              </Card>
              <Card className="rounded-3xl border-white/10 bg-[#0d121b] p-4 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Code + file sharing</div>
                  <FileCode2 className="h-4 w-4 text-cyan-400" />
                </div>
                <Input
                  value={snippetLanguage}
                  onChange={(e) => setSnippetLanguage(e.target.value)}
                  placeholder="Language"
                  className="mt-3 border-white/10 bg-white/[0.04] text-white focus-visible:ring-cyan-500/40"
                />
                <Textarea
                  value={snippetCode}
                  onChange={(e) => setSnippetCode(e.target.value)}
                  placeholder="Paste a snippet to share live in the room..."
                  className="mt-3 border-white/10 bg-white/[0.04] text-white focus-visible:ring-cyan-500/40"
                />
                <Button onClick={handleShareSnippet} disabled={!snippetCode.trim()} className="mt-3 w-full bg-cyan-500 text-slate-950">
                  <Code2 className="mr-2 h-4 w-4" />
                  Share snippet
                </Button>
              </Card>

              <Card className="rounded-3xl border-white/10 bg-[#0d121b] p-4 shadow-lg shadow-black/20">
                <div className="text-sm font-semibold text-white">Jump into call from code line</div>
                <Input
                  value={lineRef}
                  onChange={(e) => setLineRef(e.target.value)}
                  placeholder="dashboard.php:128"
                  className="mt-3 border-white/10 bg-white/[0.04] text-white focus-visible:ring-cyan-500/40"
                />
                <Button onClick={handleJumpToLine} className="mt-3 w-full border border-white/10 text-slate-200" variant="ghost">
                  <MonitorUp className="mr-2 h-4 w-4" />
                  Publish jump link
                </Button>
              </Card>

              {!directRecipientId && (
              <Card className="rounded-3xl border-white/10 bg-[#0d121b] p-4 shadow-lg shadow-black/20">
                <div className="text-sm font-semibold text-white">Schedule with calendar sync</div>
                <Input
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  placeholder="2026-04-29 10:30 CET"
                  className="mt-3 border-white/10 bg-white/[0.04] text-white focus-visible:ring-cyan-500/40"
                />
                <Button onClick={handleScheduleMeeting} disabled={!scheduleAt.trim()} className="mt-3 w-full border border-white/10 text-slate-200" variant="ghost">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Schedule meeting
                </Button>
              </Card>
              )}

              <Card className="rounded-3xl border-white/10 bg-[#0d121b] p-4 shadow-lg shadow-black/20">
                <div className="text-sm font-semibold text-white">Technical drawing + annotation</div>
                <Textarea
                  value={annotation}
                  onChange={(e) => setAnnotation(e.target.value)}
                  placeholder="Describe the marked code path, sketch note, or architecture callout..."
                  className="mt-3 border-white/10 bg-white/[0.04] text-white focus-visible:ring-cyan-500/40"
                />
                <Button onClick={handleAnnotation} disabled={!annotation.trim()} className="mt-3 w-full border border-white/10 text-slate-200" variant="ghost">
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Share annotation
                </Button>
              </Card>

              {!directRecipientId && (
              <Card className="rounded-3xl border-white/10 bg-[#0d121b] p-4 shadow-lg shadow-black/20">
                <div className="text-sm font-semibold text-white">Live polling + reactions</div>
                <Input
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Poll question"
                  className="mt-3 border-white/10 bg-white/[0.04] text-white focus-visible:ring-cyan-500/40"
                />
                <Textarea
                  value={pollOptions}
                  onChange={(e) => setPollOptions(e.target.value)}
                  placeholder={"One option per line"}
                  className="mt-3 border-white/10 bg-white/[0.04] text-white focus-visible:ring-cyan-500/40"
                />
                <div className="mt-3 flex gap-2">
                  <Button onClick={handlePublishPoll} className="flex-1 bg-cyan-500 text-slate-950">
                    <Radio className="mr-2 h-4 w-4" />
                    Publish poll
                  </Button>
                  <Input
                    value={reaction}
                    onChange={(e) => setReaction(e.target.value)}
                    className="w-28 border-white/10 bg-white/[0.04] text-white focus-visible:ring-cyan-500/40"
                  />
                </div>
                {activePoll && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                    <div className="font-semibold text-white">Current poll</div>
                    <div className="mt-1">{activePoll.message.content}</div>
                  </div>
                )}
              </Card>
              )}

              {!directRecipientId && (
              <Card className="rounded-3xl border-white/10 bg-[#0d121b] p-4 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Security + transport</div>
                  <Lock className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                    Guest links are generated securely in-room and media encryption can be toggled without leaving chat.
                  </div>
                  <Button onClick={handleSendGuestLink} variant="ghost" className="justify-start border border-white/10 text-slate-200">
                    <Link2 className="mr-2 h-4 w-4" />
                    Generate secure guest access
                  </Button>
                </div>
              </Card>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}




