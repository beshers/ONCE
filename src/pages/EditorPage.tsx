import { lazy, Suspense, useCallback, useRef, useState, useEffect, type ReactElement } from "react";
import { useParams, useNavigate } from "react-router";
import { DiffEditor } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { trpc } from "@/lib/trpcClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmbeddedTerminal from "@/components/EmbeddedTerminal";
import CollaborativeCodeEditor from "@/components/CollaborativeCodeEditor";
import DeviceEditorBridge from "@/components/DeviceEditorBridge";
import { toast } from "sonner";
import {
  FileCode, Folder, Play, MessageSquare,
  Plus, Trash2, Clock,
  Users, ArrowLeft, Share2, GitBranch, Bot, HardDrive, Settings, Sparkles, MonitorUp,
  ChevronDown, ChevronRight, FolderPlus, Radio, Activity, Mic, Video, Eye, StickyNote,
  Monitor, ShieldCheck, Wand2, GitPullRequest, Send, Crown, Bug, Archive, Box, Camera,
  Trophy, Timer, PenTool, GitMerge, BarChart3, Smartphone, Library, Package, RotateCcw,
  Cloud, Server, WifiOff, GraduationCap, LockKeyhole, Workflow, Database, ShieldAlert, Download,
  Link2, Copy,
  type LucideIcon,
} from "lucide-react";

const languages = [
  "plaintext", "javascript", "typescript", "python", "php",
  "java", "csharp", "html", "css", "go", "rust", "ruby", "sql", "json", "markdown",
];

function draftStorageKey(projectId: number, fileId: number) {
  return `ocne:project:${projectId}:file:${fileId}:draft`;
}

type StoredEditorDraft = {
  content: string;
  savedAt: number;
  isDirty: boolean;
};

const EDITOR_CACHE_DB = "ocne_editor_cache";
const EDITOR_CACHE_STORE = "drafts";
const EDITOR_CACHE_VERSION = 1;

function parseStoredDraft(raw: string | null): StoredEditorDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredEditorDraft>;
    if (typeof parsed.content === "string") {
      return {
        content: parsed.content,
        savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
        isDirty: parsed.isDirty !== false,
      };
    }
  } catch {
    return { content: raw, savedAt: 0, isDirty: true };
  }
  return null;
}

function openEditorCache() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(EDITOR_CACHE_DB, EDITOR_CACHE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EDITOR_CACHE_STORE)) {
        db.createObjectStore(EDITOR_CACHE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedDraft(projectId: number | undefined, fileId: number | null) {
  if (!projectId || !fileId) return null;
  try {
    const db = await openEditorCache();
    const key = draftStorageKey(projectId, fileId);
    return await new Promise<StoredEditorDraft | null>((resolve, reject) => {
      const request = db.transaction(EDITOR_CACHE_STORE).objectStore(EDITOR_CACHE_STORE).get(key);
      request.onsuccess = () => resolve(parseStoredDraft(JSON.stringify(request.result ?? null)));
      request.onerror = () => reject(request.error);
    });
  } catch {
    return readStoredDraftEntry(projectId, fileId);
  }
}

async function writeIndexedDraft(key: string, draft: StoredEditorDraft) {
  try {
    const db = await openEditorCache();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(EDITOR_CACHE_STORE, "readwrite").objectStore(EDITOR_CACHE_STORE).put(draft, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // localStorage is kept as the synchronous fallback.
  }
}

async function clearIndexedDraft(key: string) {
  try {
    const db = await openEditorCache();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(EDITOR_CACHE_STORE, "readwrite").objectStore(EDITOR_CACHE_STORE).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Nothing to clear when IndexedDB is unavailable.
  }
}

function readStoredDraftEntry(projectId: number | undefined, fileId: number | null) {
  if (!projectId || !fileId) return null;
  try {
    return parseStoredDraft(localStorage.getItem(draftStorageKey(projectId, fileId)));
  } catch {
    return null;
  }
}

function readStoredDraft(projectId: number | undefined, fileId: number | null) {
  return readStoredDraftEntry(projectId, fileId)?.content ?? null;
}

function writeStoredDraft(projectId: number | undefined, fileId: number | null, code: string, isDirty = true) {
  if (!projectId || !fileId) return;
  const key = draftStorageKey(projectId, fileId);
  const draft: StoredEditorDraft = {
    content: code,
    savedAt: Date.now(),
    isDirty,
  };
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // The live save still works when browser storage is unavailable.
  }
  void writeIndexedDraft(key, draft);
}

function clearStoredDraft(projectId: number | undefined, fileId: number | null) {
  if (!projectId || !fileId) return;
  const key = draftStorageKey(projectId, fileId);
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clear if browser storage is unavailable.
  }
  void clearIndexedDraft(key);
}

type StoredEditorSession = {
  lineNumber?: number;
  column?: number;
  scrollTop?: number;
  scrollLeft?: number;
  updatedAt?: number;
};

function editorSessionStorageKey(projectId: number | undefined, fileId: number | null) {
  return `ocne:project:${projectId || "new"}:file:${fileId || "none"}:editor-session`;
}

function readEditorSession(projectId: number | undefined, fileId: number | null): StoredEditorSession | null {
  if (!projectId || !fileId) return null;
  try {
    const stored = localStorage.getItem(editorSessionStorageKey(projectId, fileId));
    return stored ? JSON.parse(stored) as StoredEditorSession : null;
  } catch {
    return null;
  }
}

function writeEditorSession(projectId: number | undefined, fileId: number | null, session: StoredEditorSession) {
  if (!projectId || !fileId) return;
  try {
    localStorage.setItem(
      editorSessionStorageKey(projectId, fileId),
      JSON.stringify({ ...session, updatedAt: Date.now() }),
    );
  } catch {
    // Draft restore still works when session-position storage is unavailable.
  }
}

function editorStateStorageKey(projectId: number | undefined) {
  return `ocne:project:${projectId || "new"}:editor-state`;
}

function readEditorState(projectId: number | undefined) {
  try {
    const stored = localStorage.getItem(editorStateStorageKey(projectId));
    if (!stored) return {};
    return JSON.parse(stored) as { fileId?: number; tab?: string };
  } catch {
    return {};
  }
}

function writeEditorState(projectId: number | undefined, state: { fileId?: number | null; tab?: string }) {
  try {
    const current = readEditorState(projectId);
    localStorage.setItem(
      editorStateStorageKey(projectId),
      JSON.stringify({
        ...current,
        ...state,
        fileId: state.fileId === null ? undefined : state.fileId ?? current.fileId,
      }),
    );
  } catch {
    // URL state still keeps reloads usable when storage is blocked.
  }
}

type FeatureCard = [string, string, LucideIcon];
type ProviderCard = [string, LucideIcon];
type SaveIntent = "manual" | "auto" | "language";
type SaveStatus = "saved" | "saving" | "queued" | "unsaved" | "error" | "restoring" | "offline";
type CollaborationStatus = "solo" | "connecting" | "connected" | "disconnected";
type ProjectVisibility = "public" | "friends" | "selected" | "private";
const projectVisibilityOptions: Array<{ value: ProjectVisibility; label: string; help: string }> = [
  { value: "public", label: "Public for all users", help: "Everyone on OCNE can discover and open this project." },
  { value: "friends", label: "Only friends", help: "All accepted friends can open the project." },
  { value: "selected", label: "Selected friends", help: "Only the friends you choose can open the project." },
  { value: "private", label: "Private", help: "Only you and direct collaborators can open the project." },
];
const LocalAgentPage = lazy(() => import("@/pages/LocalAgentPage"));
const AGENT_COMMAND_KEY = "ocne-agent-command";
const AGENT_AUTOCONNECT_KEY = "ocne-agent-autoconnect-requested";
const DATABASE_AUTOSAVE_DELAY_MS = 1500;
const BACKGROUND_FILE_REFRESH_MS = 15000;

function projectVisibilityOf(project: { projectVisibility?: string | null; isPublic?: boolean | null } | null | undefined): ProjectVisibility {
  if (project?.projectVisibility === "public" || project?.projectVisibility === "friends" || project?.projectVisibility === "selected" || project?.projectVisibility === "private") {
    return project.projectVisibility;
  }
  return project?.isPublic ? "public" : "private";
}

function projectVisibilityLabel(project: { projectVisibility?: string | null; isPublic?: boolean | null } | null | undefined) {
  return projectVisibilityOptions.find((option) => option.value === projectVisibilityOf(project))?.label || "Private";
}

function parseSelectedProjectFriends(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ? parseInt(id) : undefined;
  const storedEditorState = readEditorState(projectId);

  const [activeFileId, setActiveFileId] = useState<number | null>(() => {
    const sharedFileId = Number(new URLSearchParams(window.location.search).get("file"));
    return sharedFileId || storedEditorState.fileId || null;
  });
  const [draftsByFileId, setDraftsByFileId] = useState<Record<number, string>>({});
  const [savedCodeByFileId, setSavedCodeByFileId] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tab || storedEditorState.tab || "editor";
  });
  const [newFileName, setNewFileName] = useState("");
  const [newFileLang, setNewFileLang] = useState("plaintext");
  const [newItemType, setNewItemType] = useState<"file" | "folder">("file");
  const [newParentId, setNewParentId] = useState("root");
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewLineStart, setReviewLineStart] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [followUserId, setFollowUserId] = useState<string | null>(null);
  const [liveChatMessage, setLiveChatMessage] = useState("");
  const [liveChatMessages, setLiveChatMessages] = useState<Array<{ id: number; author: string; text: string; line?: number }>>([]);
  const [challengeMinutes, setChallengeMinutes] = useState("30");
  const [snippetDraft, setSnippetDraft] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [deviceBridgeOpen, setDeviceBridgeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMode, setShareMode] = useState<"view" | "collab">("view");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveMessage, setSaveMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [saveClockTick, setSaveClockTick] = useState(() => Date.now());
  const [wordWrapEnabled, setWordWrapEnabled] = useState(true);
  const [minimapEnabled, setMinimapEnabled] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [collaborationStatus, setCollaborationStatus] = useState<CollaborationStatus>("solo");
  const [selectedFriendDraft, setSelectedFriendDraft] = useState<string[] | null>(null);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const saveIntentRef = useRef<SaveIntent>("manual");
  const queuedSaveIntentRef = useRef<SaveIntent | null>(null);
  const editorSessionDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const editorSessionSaveTimerRef = useRef<number | null>(null);

  const utils = trpc.useUtils();

  const { data: project } = trpc.project.get.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );
  const { data: friends = [] } = trpc.friend.list.useQuery(undefined, {
    enabled: !!projectId,
  });
  const { data: files } = trpc.project.fileList.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId,
      refetchInterval: project?.collaborationMode && project.collaborationMode !== "solo" ? 5000 : BACKGROUND_FILE_REFRESH_MS,
    }
  );
  const { data: versions } = trpc.project.versions.useQuery(
    { fileId: activeFileId! },
    { enabled: !!activeFileId }
  );
  const { data: reviews } = trpc.review.list.useQuery(
    { fileId: activeFileId! },
    {
      enabled: !!activeFileId,
      refetchInterval: project?.collaborationMode && project.collaborationMode !== "solo" ? 7000 : false,
    }
  );
  const { data: collaborators } = trpc.project.collaborators.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId,
      refetchInterval: project?.collaborationMode && project.collaborationMode !== "solo" ? 10000 : false,
    }
  );
  const { data: liveState } = trpc.project.liveState.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId && Boolean(project?.collaborationMode && project.collaborationMode !== "solo"),
      refetchInterval: 5000,
    }
  );
  const { data: allProjects } = trpc.project.list.useQuery(undefined, {
    enabled: !projectId,
  });
  const { data: publicProjectRows } = trpc.project.publicProjects.useQuery(undefined, {
    enabled: !projectId,
  });
  const heartbeat = trpc.project.heartbeat.useMutation();

  const saveFile = trpc.project.fileUpdate.useMutation({
    onSuccess: (_data, variables) => {
      const currentLocalDraft = readStoredDraft(projectId, variables.id);
      const hasNewerLocalDraft = currentLocalDraft !== null && currentLocalDraft !== variables.content;
      if (saveIntentRef.current === "manual") {
        toast.success("Code saved to database.");
      }
      setSavedCodeByFileId((current) => ({ ...current, [variables.id]: variables.content }));
      setSaveStatus(hasNewerLocalDraft ? "unsaved" : "saved");
      setLastSavedAt(new Date());
      setSaveMessage(hasNewerLocalDraft ? "Saved latest synced version. New edits are still waiting." : "Saved to database and this browser.");
      if (saveIntentRef.current === "manual") {
        setCommitMessage("");
      }
      if (!hasNewerLocalDraft) {
        clearStoredDraft(projectId, variables.id);
      }
      utils.project.fileList.invalidate({ projectId: projectId! });
      utils.project.versions.invalidate({ fileId: variables.id });
    },
    onError: (error) => {
      setSaveStatus("error");
      toast.error(error.message || "Could not save this file.");
    },
  });

  const createFile = trpc.project.fileCreate.useMutation({
    onSuccess: (data) => {
      toast.success(newItemType === "folder" ? "Folder created!" : "File created!");
      utils.project.fileList.invalidate({ projectId: projectId! });
      if (newItemType === "folder" && data.id) {
        setExpandedFolders((folders) => new Set([...folders, data.id]));
      } else if (data.id) {
        setActiveFileId(data.id);
        setActiveTab("editor");
      }
      setCreateFileOpen(false);
      setNewFileName("");
      setNewItemType("file");
      setNewParentId("root");
    },
  });

  const createReview = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("Review comment added!");
      utils.review.list.invalidate({ fileId: activeFileId! });
      setReviewText("");
    },
  });

  const updateReviewStatus = trpc.review.updateStatus.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate({ fileId: activeFileId! });
    },
    onError: (error) => {
      toast.error(error.message || "Could not update this thread.");
    },
  });

  const deleteFile = trpc.project.fileDelete.useMutation({
    onSuccess: () => {
      toast.success("File deleted!");
      utils.project.fileList.invalidate({ projectId: projectId! });
      if (activeFileId) {
        setDraftsByFileId((current) => {
          const next = { ...current };
          delete next[activeFileId];
          return next;
        });
        setSavedCodeByFileId((current) => {
          const next = { ...current };
          delete next[activeFileId];
          return next;
        });
        clearStoredDraft(projectId, activeFileId);
      }
      setActiveFileId(null);
      writeEditorState(projectId, { fileId: null });
    },
  });

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      toast.success("Project settings saved");
      utils.project.get.invalidate({ id: projectId! });
      utils.project.list.invalidate();
      utils.project.publicProjects.invalidate();
    },
  });

  const restoreVersion = trpc.project.restoreVersion.useMutation({
    onSuccess: () => {
      toast.success("Version restored!");
      setSelectedVersionId(null);
      if (activeFileId) {
        setDraftsByFileId((current) => {
          const next = { ...current };
          delete next[activeFileId];
          return next;
        });
        setSavedCodeByFileId((current) => {
          const next = { ...current };
          delete next[activeFileId];
          return next;
        });
        clearStoredDraft(projectId, activeFileId);
        setSaveStatus("saved");
      }
      utils.project.fileList.invalidate({ projectId: projectId! });
      utils.project.versions.invalidate({ fileId: activeFileId! });
    },
    onError: (error) => {
      toast.error(error.message || "Could not restore this version.");
    },
  });

  const activeFile = files?.find((f) => f.id === activeFileId);
  const serverCode = activeFile?.content || "";
  const originalCode = activeFileId ? savedCodeByFileId[activeFileId] ?? serverCode : "";
  const storedDraft = readStoredDraft(projectId, activeFileId);
  const code = activeFileId ? draftsByFileId[activeFileId] ?? (storedDraft !== null && storedDraft !== originalCode ? storedDraft : originalCode) : "";
  const isModified = code !== originalCode;
  const folders = (files || []).filter((item) => item.type === "folder");
  const liveUsers = liveState?.users || [];
  const liveActivity = liveState?.activity || [];
  const followedUser = liveUsers.find((user) => user.userId === followUserId);
  const openReviews = (reviews || []).filter((item) => item.review.status === "open").length;
  const latestVersion = versions?.[0]?.version;
  const selectedVersion = (versions || []).find((item) => item.version.id === selectedVersionId) || versions?.[0] || null;
  const lastCodeSteps = (versions || []).slice(0, 6);
  const collaborationEnabled = Boolean(project?.collaborationMode && project.collaborationMode !== "solo");
  const canShowPreview = ["html", "css", "javascript"].includes(activeFile?.language || "");
  const previewDocument = activeFile?.language === "html"
    ? code
    : `<!doctype html><html><head><style>${activeFile?.language === "css" ? code : ""}</style></head><body><div id="app"></div><script>${activeFile?.language === "javascript" ? code : ""}</script></body></html>`;
  const projectShareBaseUrl = projectId
    ? `${window.location.origin}/projects/${projectId}${activeFileId ? `?file=${activeFileId}` : ""}`
    : window.location.origin;
  const shareUrl = projectId
    ? `${projectShareBaseUrl}${projectShareBaseUrl.includes("?") ? "&" : "?"}share=${shareMode}&aiContext=project`
    : window.location.origin;
  const devicePreviewUrl = projectId
    ? `${projectShareBaseUrl}${projectShareBaseUrl.includes("?") ? "&" : "?"}preview=device&share=view&aiContext=project`
    : window.location.origin;
  const deviceQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(devicePreviewUrl)}`;
  const togetherShareUrl = projectId
    ? `${projectShareBaseUrl}${projectShareBaseUrl.includes("?") ? "&" : "?"}share=collab&together=true&aiContext=project`
    : window.location.origin;
  const editableCollaborators = (collaborators || []).filter((item) => item.collab.role === "owner" || item.collab.role === "editor").length;
  const acceptedFriends = friends.filter((friend) => friend.status === "accepted" && friend.user?.id);
  const savedSelectedFriendIds = parseSelectedProjectFriends(project?.selectedFriendIds);
  const effectiveSelectedFriendIds = selectedFriendDraft ?? savedSelectedFriendIds;
  const effectiveProjectVisibility = projectVisibilityOf(project);

  const detectRunCommand = () => {
    const packageJson = (files || []).find((file) => file.type === "file" && file.name === "package.json");
    if (packageJson?.content) {
      try {
        const manifest = JSON.parse(packageJson.content) as { scripts?: Record<string, string> };
        if (manifest.scripts?.dev) return "npm run dev";
        if (manifest.scripts?.start) return "npm start";
        if (manifest.scripts?.preview) return "npm run preview";
      } catch {
        // Fall back to file-type commands when package.json is not valid JSON.
      }
    }

    if (activeFile?.language === "python" || activeFile?.name.endsWith(".py")) {
      return activeFile?.name ? `python "${activeFile.name}"` : "python --version";
    }
    if (activeFile?.language === "php" || activeFile?.name.endsWith(".php")) {
      return activeFile?.name ? `php "${activeFile.name}"` : "php -v";
    }
    if (activeFile?.language === "javascript" || activeFile?.name.endsWith(".js")) {
      return activeFile?.name ? `node "${activeFile.name}"` : "node --version";
    }
    if (activeFile?.language === "typescript" || activeFile?.name.endsWith(".ts")) {
      return "npm run dev";
    }
    if (activeFile?.language === "html" || activeFile?.name.endsWith(".html")) {
      return "npx http-server . -p 5173";
    }
    return "npm run dev";
  };

  const setCode = (nextCode: string) => {
    if (!activeFileId) return;
    setDraftsByFileId((current) => ({ ...current, [activeFileId]: nextCode }));
    writeStoredDraft(projectId, activeFileId, nextCode);
    setSaveStatus(nextCode === originalCode ? "saved" : "unsaved");
  };

  useEffect(() => {
    if (!projectId || !files) return;
    const selectableFiles = files.filter((file) => file.type === "file");
    let restoreTimer: number | undefined;
    if (selectableFiles.length === 0) {
      if (activeFileId !== null) {
        restoreTimer = window.setTimeout(() => setActiveFileId(null), 0);
      }
      return () => {
        if (restoreTimer) window.clearTimeout(restoreTimer);
      };
    }

    const activeStillExists = activeFileId
      ? selectableFiles.some((file) => file.id === activeFileId)
      : false;
    if (activeStillExists) return;

    const storedFileId = readEditorState(projectId).fileId;
    const restoredFile = storedFileId
      ? selectableFiles.find((file) => file.id === storedFileId)
      : null;
    restoreTimer = window.setTimeout(() => {
      setActiveFileId(restoredFile?.id ?? selectableFiles[0].id);
    }, 0);
    return () => {
      if (restoreTimer) window.clearTimeout(restoreTimer);
    };
  }, [activeFileId, files, projectId]);

  useEffect(() => {
    if (!projectId) return;
    writeEditorState(projectId, { fileId: activeFileId, tab: activeTab });

    const searchParams = new URLSearchParams(window.location.search);
    if (activeFileId) {
      searchParams.set("file", String(activeFileId));
    } else {
      searchParams.delete("file");
    }
    if (activeTab && activeTab !== "editor") {
      searchParams.set("tab", activeTab);
    } else {
      searchParams.delete("tab");
    }

    const queryString = searchParams.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
    if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [activeFileId, activeTab, projectId]);

  useEffect(() => {
    if (!projectId || !project?.collaborationMode || project.collaborationMode === "solo") return;

    const sendHeartbeat = () => {
      heartbeat.mutate({
        projectId,
        activeFileId: activeFileId ?? null,
        activeFileName: activeFile?.name || null,
        status: isModified ? "editing" : "viewing",
      });
    };

    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 12000);
    return () => window.clearInterval(timer);
  }, [projectId, project?.collaborationMode, activeFileId, activeFile?.name, isModified, heartbeat]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => setSaveMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

  useEffect(() => {
    if (!lastSavedAt) return;
    const timer = window.setInterval(() => setSaveClockTick(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [lastSavedAt]);

  useEffect(() => {
    return () => {
      editorSessionDisposablesRef.current.forEach((disposable) => disposable.dispose());
      editorSessionDisposablesRef.current = [];
      if (editorSessionSaveTimerRef.current) {
        window.clearTimeout(editorSessionSaveTimerRef.current);
        editorSessionSaveTimerRef.current = null;
      }
    };
  }, []);

  const saveActiveFile = useCallback(async (intent: SaveIntent = "manual") => {
    if (!activeFileId || !activeFile) return;
    if (saveFile.isPending) {
      queuedSaveIntentRef.current = intent;
      setSaveStatus("queued");
      setSaveMessage("Database sync queued. OCNE will upload the latest code next.");
      writeStoredDraft(projectId, activeFileId, code);
      return;
    }
    if (!isModified) {
      setSaveStatus("saved");
      if (intent === "manual") {
        setSaveMessage("Already saved.");
      }
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      writeStoredDraft(projectId, activeFileId, code);
      setSaveStatus("offline");
      setSaveMessage("Offline draft saved in this browser. OCNE will sync when the network returns.");
      return;
    }
    saveIntentRef.current = intent;
    setSaveStatus("saving");
    await saveFile.mutateAsync({
      id: activeFileId,
      content: code,
      language: activeFile?.language || "plaintext",
      commitMessage: intent === "manual" ? commitMessage.trim() || undefined : "Save Live sync",
    });
  }, [activeFile, activeFileId, code, commitMessage, isModified, projectId, saveFile]);

  const handleSave = () => {
    if (!activeFile) {
      toast.info("Select a file before saving.");
      return;
    }
    void saveActiveFile("manual").catch(() => undefined);
  };

  const openProjectFile = useCallback((nextFileId: number) => {
    if (activeFileId && activeFile && isModified) {
      void saveActiveFile("auto").catch(() => undefined);
    }
    setActiveFileId(nextFileId);
  }, [activeFile, activeFileId, isModified, saveActiveFile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (!activeFileId) return;
      void saveActiveFile("manual").catch(() => undefined);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFileId, saveActiveFile]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus("offline");
      setSaveMessage("Offline. OCNE is saving locally and will sync to the database when you reconnect.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (saveFile.isPending || !queuedSaveIntentRef.current) return;
    const intent = queuedSaveIntentRef.current;
    queuedSaveIntentRef.current = null;
    if (!activeFileId || !activeFile || !isModified) {
      return;
    }
    void saveActiveFile(intent).catch(() => undefined);
  }, [activeFile, activeFileId, isModified, saveActiveFile, saveFile.isPending]);

  useEffect(() => {
    if (!activeFileId || !activeFile) return;
    let cancelled = false;
    const serverContent = activeFile.content || "";
    const serverUpdatedAt = activeFile.updatedAt ? new Date(activeFile.updatedAt).getTime() : 0;
    const syncTimer = window.setTimeout(() => {
      if (cancelled) return;
      const localDraft = readStoredDraftEntry(projectId, activeFileId);
      const localHasDifferentContent = Boolean(localDraft && localDraft.content !== serverContent);
      const databaseIsNewer = Boolean(localDraft?.savedAt && serverUpdatedAt && serverUpdatedAt > localDraft.savedAt);

      setSavedCodeByFileId((current) => current[activeFileId] === serverContent ? current : { ...current, [activeFileId]: serverContent });

      if (localHasDifferentContent && databaseIsNewer) {
        clearStoredDraft(projectId, activeFileId);
        setDraftsByFileId((current) => {
          const next = { ...current };
          delete next[activeFileId];
          return next;
        });
        setSaveStatus("saved");
        setLastSavedAt(new Date(serverUpdatedAt));
        setSaveMessage("Restored latest code from the database.");
        return;
      }

      if (!localHasDifferentContent) {
        clearStoredDraft(projectId, activeFileId);
      }

      setSaveStatus((status) => status === "restoring" ? "saved" : status);

      void readIndexedDraft(projectId, activeFileId).then((indexedDraft) => {
        if (cancelled || !indexedDraft || indexedDraft.content === serverContent) return;
        const indexedIsNewer = !serverUpdatedAt || indexedDraft.savedAt >= serverUpdatedAt;
        if (!indexedIsNewer) return;
        setDraftsByFileId((current) => ({ ...current, [activeFileId]: indexedDraft.content }));
        setSaveStatus(indexedDraft.isDirty ? "unsaved" : "saved");
        setSaveMessage(indexedDraft.isDirty ? "Restored local draft. Database sync will continue automatically." : "");
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(syncTimer);
    };
  }, [activeFile, activeFileId, projectId]);

  useEffect(() => {
    const persistCurrentDraft = () => {
      if (!isModified || !activeFileId) return;
      writeStoredDraft(projectId, activeFileId, code);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushLiveSave();
      }
    };
    const flushLiveSave = () => {
      persistCurrentDraft();
      if (!activeFileId || !activeFile || !isModified) return;
      void saveActiveFile("auto").catch(() => undefined);
    };

    window.addEventListener("blur", flushLiveSave);
    window.addEventListener("pagehide", flushLiveSave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("blur", flushLiveSave);
      window.removeEventListener("pagehide", flushLiveSave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeFile, activeFileId, code, isModified, projectId, saveActiveFile]);

  useEffect(() => {
    if (!activeFileId || !activeFile || !isModified) return;

    const timer = window.setTimeout(() => {
      void saveActiveFile("auto").catch(() => undefined);
    }, DATABASE_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [activeFileId, activeFile, code, isModified, project?.collaborationMode, saveActiveFile]);

  useEffect(() => {
    if (!activeFileId || !isModified) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      writeStoredDraft(projectId, activeFileId, code);
      void saveActiveFile("auto").catch(() => undefined);
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeFileId, code, isModified, projectId, saveActiveFile]);

  useEffect(() => {
    const handleOnline = () => {
      if (!activeFileId || !activeFile || !isModified) return;
      setSaveMessage("Back online. Syncing your latest draft...");
      void saveActiveFile("auto").catch(() => undefined);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [activeFile, activeFileId, isModified, saveActiveFile]);

  const handleRun = () => {
    setActiveTab("local-agent");
    setDeviceBridgeOpen(true);
    const command = detectRunCommand();
    localStorage.setItem(AGENT_COMMAND_KEY, command);
    localStorage.setItem(AGENT_AUTOCONNECT_KEY, "true");
    window.dispatchEvent(new Event("ocne-agent-run-request"));
    if (activeFile && isModified) {
      void saveActiveFile("manual").catch(() => undefined);
    }
    if (project?.localFilesEnabled) {
      toast.info(`Terminal Agent is ready to connect. Command prepared: ${command}`);
    } else {
      toast.info("Enable local files in Project Settings before running on a device.");
    }
  };

  const handleShare = async () => {
    if (!projectId) {
      toast.info("Open a project before sharing.");
      return;
    }
    setShareOpen(true);
  };

  const startTogetherCoding = () => {
    if (!projectId) return;
    if (project?.collaborationMode === "solo") {
      updateProject.mutate({ id: projectId, collaborationMode: "team" });
    }
    setShareMode("collab");
    setActiveTab("together");
    void navigator.clipboard.writeText(togetherShareUrl)
      .then(() => toast.success("Together Coding link copied. Send it to your teammate."))
      .catch(() => toast.info("Together Coding is ready. Copy the link from the Together tab."));
  };

  const createShareLink = async () => {
    if (activeFile) {
      await saveActiveFile("manual").catch(() => undefined);
    }
    const title = project?.name ? `OCNE project: ${project.name}` : "OCNE project";

    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Project link copied to clipboard.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Project link copied to clipboard.");
      } catch {
        toast.error("Could not share this project link.");
      }
    }
  };

  const sendLiveChat = (line?: number) => {
    const text = liveChatMessage.trim();
    if (!text) return;
    setLiveChatMessages((messages) => [
      ...messages,
      {
        id: Date.now(),
        author: "You",
        text,
        line,
      },
    ]);
    setLiveChatMessage("");
  };

  // Line numbers for the textarea
  const lines = code.split("\n");
  const stepColors = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#fb7185", "#60a5fa", "#f472b6"];
  const stepColorFor = (value: string | number | null | undefined) => {
    const text = String(value || "unknown");
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) % stepColors.length;
    }
    return stepColors[Math.abs(hash) % stepColors.length];
  };
  const authorNameFor = (step: NonNullable<typeof versions>[number]) =>
    step.author?.name || step.author?.username || `User ${step.version.userId}`;
  const codeStepSummary = (before: string, after: string) => {
    const beforeLines = before.split("\n");
    const afterLines = after.split("\n");
    const maxLines = Math.max(beforeLines.length, afterLines.length);
    let changed = 0;
    for (let index = 0; index < maxLines; index += 1) {
      if ((beforeLines[index] || "") !== (afterLines[index] || "")) changed += 1;
    }
    const delta = afterLines.length - beforeLines.length;
    const lineText = changed === 1 ? "1 changed line" : `${changed} changed lines`;
    if (delta > 0) return `${lineText}, +${delta} lines`;
    if (delta < 0) return `${lineText}, ${delta} lines`;
    return lineText;
  };
  const formatRelativeSaveTime = (date: Date | null) => {
    if (!date) return "";
    const seconds = Math.max(0, Math.floor((saveClockTick - date.getTime()) / 1000));
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const effectiveSaveStatus: SaveStatus = !isOnline
    ? "offline"
    : saveStatus === "restoring"
      ? "restoring"
      : saveStatus === "saving" || saveStatus === "queued"
    ? saveStatus
      : isModified
        ? saveStatus === "error" ? "error" : "unsaved"
        : "saved";
  const saveStatusText: Record<SaveStatus, string> = {
    saved: lastSavedAt ? `Saved ${formatRelativeSaveTime(lastSavedAt)}` : "Saved",
    saving: "Saving to database...",
    queued: "Database sync queued",
    unsaved: "Unsaved changes",
    error: "Save failed",
    restoring: "Restoring from database",
    offline: "Offline - saved locally",
  };
  const saveStatusDetail: Record<SaveStatus, string> = {
    saved: "Local cache and database are synced.",
    saving: "Uploading the latest code to the database.",
    queued: "A save is already running. The newest code will sync next.",
    unsaved: "Saved locally. Database sync will run automatically.",
    error: "Local draft is protected. Try saving again.",
    restoring: "Loading the latest database version.",
    offline: "Writing locally now. Database sync resumes online.",
  };
  const saveStatusPillClass: Record<SaveStatus, string> = {
    saved: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
    saving: "border-cyan-400/25 bg-cyan-500/10 text-cyan-200",
    queued: "border-amber-400/25 bg-amber-500/10 text-amber-200",
    unsaved: "border-amber-400/25 bg-amber-500/10 text-amber-200",
    error: "border-red-400/25 bg-red-500/10 text-red-200",
    restoring: "border-cyan-400/25 bg-cyan-500/10 text-cyan-200",
    offline: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  };
  const saveStatusDotClass: Record<SaveStatus, string> = {
    saved: "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]",
    saving: "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.85)] animate-pulse",
    queued: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.85)] animate-pulse",
    unsaved: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.85)]",
    error: "bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.85)]",
    restoring: "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.85)] animate-pulse",
    offline: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.85)]",
  };
  const collaborationStatusText: Record<CollaborationStatus, string> = {
    solo: "Solo editor",
    connecting: "Connecting",
    connected: "CRDT synced",
    disconnected: "Offline",
  };

  const handleFormatDocument = () => {
    const action = editorRef.current?.getAction("editor.action.formatDocument");
    if (!action) {
      toast.info("Formatting is not available for this file type.");
      return;
    }
    void action.run().catch(() => toast.error("Could not format this file."));
  };

  const handleResetDraft = () => {
    if (!activeFileId) return;
    setDraftsByFileId((current) => {
      const next = { ...current };
      delete next[activeFileId];
      return next;
    });
    clearStoredDraft(projectId, activeFileId);
    setSaveStatus("saved");
    toast.info("Unsaved draft discarded.");
  };

  const handleDownloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activeFile.name || "ocne-file.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleEditorReady = useCallback((editor: Monaco.editor.IStandaloneCodeEditor | null) => {
    editorSessionDisposablesRef.current.forEach((disposable) => disposable.dispose());
    editorSessionDisposablesRef.current = [];
    if (editorSessionSaveTimerRef.current) {
      window.clearTimeout(editorSessionSaveTimerRef.current);
      editorSessionSaveTimerRef.current = null;
    }

    editorRef.current = editor;
    if (!editor || !projectId || !activeFileId) return;

    const saveEditorSession = () => {
      if (editorSessionSaveTimerRef.current) {
        window.clearTimeout(editorSessionSaveTimerRef.current);
      }
      editorSessionSaveTimerRef.current = window.setTimeout(() => {
        const position = editor.getPosition();
        writeEditorSession(projectId, activeFileId, {
          lineNumber: position?.lineNumber,
          column: position?.column,
          scrollTop: editor.getScrollTop(),
          scrollLeft: editor.getScrollLeft(),
        });
      }, 120);
    };

    const storedSession = readEditorSession(projectId, activeFileId);
    if (storedSession) {
      window.setTimeout(() => {
        const model = editor.getModel();
        const lineCount = model?.getLineCount() || 1;
        const lineNumber = Math.min(Math.max(1, storedSession.lineNumber || 1), lineCount);
        const maxColumn = model?.getLineMaxColumn(lineNumber) || 1;
        const column = Math.min(Math.max(1, storedSession.column || 1), maxColumn);
        editor.setPosition({ lineNumber, column });
        editor.revealPositionInCenterIfOutsideViewport({ lineNumber, column });
        if (typeof storedSession.scrollTop === "number") {
          editor.setScrollTop(storedSession.scrollTop);
        }
        if (typeof storedSession.scrollLeft === "number") {
          editor.setScrollLeft(storedSession.scrollLeft);
        }
        editor.focus();
      }, 0);
    }

    editorSessionDisposablesRef.current = [
      editor.onDidChangeCursorPosition(saveEditorSession),
      editor.onDidScrollChange(saveEditorSession),
      editor.onDidChangeModelContent(saveEditorSession),
      {
        dispose: () => {
          const position = editor.getPosition();
          writeEditorSession(projectId, activeFileId, {
            lineNumber: position?.lineNumber,
            column: position?.column,
            scrollTop: editor.getScrollTop(),
            scrollLeft: editor.getScrollLeft(),
          });
        },
      },
    ];
  }, [activeFileId, projectId]);

  const openCreateDialog = (parentId: number | null = null, type: "file" | "folder" = "file") => {
    setNewItemType(type);
    setNewParentId(parentId ? String(parentId) : "root");
    setCreateFileOpen(true);
  };

  const toggleFolder = (folderId: number) => {
    setExpandedFolders((folders) => {
      const next = new Set(folders);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateProjectItem = () => {
    const name = newFileName.trim();
    if (!name) return;
    createFile.mutate({
      projectId: projectId!,
      parentId: newParentId === "root" ? undefined : Number(newParentId),
      name,
      type: newItemType,
      content: newItemType === "file" ? "" : undefined,
      language: newItemType === "file" ? newFileLang : "plaintext",
    });
  };

  const languageFromName = (name: string) => {
    const extension = name.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      php: "php",
      java: "java",
      cs: "csharp",
      html: "html",
      css: "css",
      go: "go",
      rs: "rust",
      rb: "ruby",
      sql: "sql",
      json: "json",
      md: "markdown",
    };
    return extension ? map[extension] || "plaintext" : "plaintext";
  };

  const importDeviceProject = async (items: Array<{ path: string; name: string; type: "file" | "folder"; content?: string; language?: string }>) => {
    const sorted = [...items].sort((a, b) => {
      const depthA = a.path.split(/[\\/]/).length;
      const depthB = b.path.split(/[\\/]/).length;
      if (depthA !== depthB) return depthA - depthB;
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
    const folderIds = new Map<string, number>();

    for (const item of sorted) {
      const parts = item.path.split(/[\\/]/).filter(Boolean);
      const parentPath = parts.slice(0, -1).join("/");
      const parentId = parentPath ? folderIds.get(parentPath) : undefined;
      const result = await createFile.mutateAsync({
        projectId: projectId!,
        parentId,
        name: item.name || parts.at(-1) || "imported",
        type: item.type,
        content: item.type === "file" ? item.content || "" : undefined,
        language: item.type === "file" ? item.language || languageFromName(item.name) : "plaintext",
      });
      if (item.type === "folder") {
        folderIds.set(parts.join("/"), result.id);
      }
    }

    await utils.project.fileList.invalidate({ projectId: projectId! });
    toast.success(`Imported ${sorted.length} items from device`);
  };

  const handleDeleteProjectItem = (item: NonNullable<typeof files>[number]) => {
    const message = item.type === "folder"
      ? `Delete folder "${item.name}" and all files inside it?`
      : `Delete file "${item.name}"?`;
    if (!confirm(message)) return;
    deleteFile.mutate({ id: item.id });
  };

  const usersForFile = (fileId: number) => liveUsers.filter((user) => user.activeFileId === fileId);

  const activityText = (item: NonNullable<typeof liveState>["activity"][number]) => {
    const target = item.target ? ` ${item.target}` : "";
    const action = item.action.replace(/_/g, " ");
    return `${item.name} ${action}${target}`;
  };

  const renderFileTree = (parentId: number | null = null, depth = 0): ReactElement[] => {
    const children = (files || [])
      .filter((item) => (item.parentId ?? null) === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return children.map((item) => {
      const isFolder = item.type === "folder";
      const isExpanded = expandedFolders.has(item.id);
      return (
        <div key={item.id}>
          <div
            className={`group flex items-center gap-1.5 rounded px-2 py-1.5 text-xs transition-all ${
              activeFileId === item.id
                ? "bg-cyan-500/10 text-cyan-400"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
            style={{ paddingLeft: `${8 + depth * 14}px` }}
            onClick={() => {
              if (isFolder) {
                toggleFolder(item.id);
              } else {
                openProjectFile(item.id);
              }
            }}
          >
            {isFolder ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFolder(item.id);
                }}
                className="text-slate-500 hover:text-slate-200"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <span className="w-3" />
            )}
            {isFolder ? (
              <Folder className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <FileCode className="h-3.5 w-3.5 text-sky-400" />
            )}
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            {isFolder && (
              <button
                type="button"
                title="Create inside folder"
                onClick={(event) => {
                  event.stopPropagation();
                  setExpandedFolders((folders) => new Set([...folders, item.id]));
                  openCreateDialog(item.id, "file");
                }}
                className="opacity-0 text-cyan-300 hover:text-cyan-200 group-hover:opacity-100"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            {usersForFile(item.id).length > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300">
                {usersForFile(item.id).length}
              </span>
            )}
            <button
              type="button"
              title="Delete"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteProjectItem(item);
              }}
              className="opacity-0 text-red-400 hover:text-red-300 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          {isFolder && isExpanded && renderFileTree(item.id, depth + 1)}
        </div>
      );
    });
  };

  if (!projectId) {
    // Show project selector when no project ID
    const ownedProjects = allProjects?.owned || [];
    const collaboratedProjects = allProjects?.collaborated || [];
    const personalIds = new Set([...ownedProjects, ...collaboratedProjects].map((project) => project.id));
    const visibleProjects = [
      ...ownedProjects.map((project) => ({ ...project, projectSource: "owned" as const })),
      ...collaboratedProjects.map((project) => ({ ...project, projectSource: "collaborated" as const })),
      ...(publicProjectRows || [])
        .filter((row) => !personalIds.has(row.project.id))
        .map((row) => ({ ...row.project, owner: row.owner, projectSource: "public" as const })),
    ];
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#0d1220] p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge className="mb-3 bg-cyan-500/10 text-cyan-200">Online Code Network Editor</Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Choose a project to code</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Open a workspace with files, folders, live collaboration, AI help, and a device terminal when local access is enabled.
              </p>
            </div>
            <Button onClick={() => navigate("/projects")} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Plus className="mr-2 h-4 w-4" /> Create project
            </Button>
          </div>
        </div>
        {visibleProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
            <FileCode className="mx-auto mb-4 h-10 w-10 text-slate-600" />
            <h2 className="text-lg font-semibold text-white">No projects yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first project, choose a language, then start writing code in the online editor.
            </p>
            <Button onClick={() => navigate("/projects")} className="mt-5 bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Plus className="mr-2 h-4 w-4" /> New project
            </Button>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((p) => (
            <Card
              key={p.id}
              className="group cursor-pointer border-white/10 bg-[#111827] p-5 transition-all hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-[#151d2e]"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-sm font-semibold text-cyan-100">
                  {(p.language || "code").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-white group-hover:text-cyan-200">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{p.description || "Ready for files, folders, and live coding."}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="border-white/10 text-[10px] text-slate-400">{p.language || "plaintext"}</Badge>
                    <Badge className="bg-emerald-500/10 text-[10px] text-emerald-300">{p.collaborationMode || "solo"}</Badge>
                    {p.projectSource === "public" && (
                      <Badge className="bg-cyan-500/10 text-[10px] text-cyan-200">
                        {projectVisibilityLabel(p)} by {p.owner?.name || p.owner?.username || "OCNE user"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-[1500px] flex-col rounded-2xl border border-white/10 bg-[#070a12] p-3 shadow-2xl shadow-black/25">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0d1220] px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="shrink-0 text-slate-400 hover:bg-white/10 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-white sm:text-lg">{project?.name || "Editor"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] h-5">
                {activeFile?.language || project?.language || "plaintext"}
              </Badge>
              <span
                title={saveStatusDetail[effectiveSaveStatus]}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${saveStatusPillClass[effectiveSaveStatus]}`}
              >
                <span className={`h-2 w-2 rounded-full ${saveStatusDotClass[effectiveSaveStatus]}`} />
                {saveStatusText[effectiveSaveStatus]}
              </span>
              {project?.collaborationMode && project.collaborationMode !== "solo" && (
                <span className="text-emerald-400">Live sync on</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {liveUsers.length > 0 && (
            <div className="hidden items-center gap-1 md:flex">
              {liveUsers.slice(0, 5).map((user) => (
                <div
                  key={user.userId}
                  title={`${user.name}${user.activeFileName ? ` - ${user.activeFileName}` : ""}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-cyan-500 to-violet-600 text-[10px] font-bold text-white"
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {liveUsers.length > 5 && (
                <span className="text-xs text-slate-500">+{liveUsers.length - 5}</span>
              )}
            </div>
          )}
          <Input
            value={commitMessage}
            onChange={(event) => setCommitMessage(event.target.value)}
            disabled={!activeFile || saveFile.isPending}
            placeholder="Commit message"
            className="h-8 w-44 border-white/10 bg-white/[0.04] text-xs text-white placeholder:text-slate-600"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!activeFile}
            className={`border hover:bg-white/10 ${
              effectiveSaveStatus === "unsaved" || effectiveSaveStatus === "queued" || effectiveSaveStatus === "saving"
                ? "border-cyan-400/25 text-cyan-300 hover:text-cyan-200"
                : "border-emerald-400/20 text-emerald-300 hover:text-emerald-200"
            }`}
          >
            <span className={`mr-1.5 h-2.5 w-2.5 rounded-full ${saveStatusDotClass[effectiveSaveStatus]}`} />
            {saveFile.isPending ? "Queue save" : isModified ? "Save now" : "Saved"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRun}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
          >
            <Smartphone className="w-4 h-4 mr-1.5" /> Run on device
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleShare()} className="text-slate-400 hover:bg-white/10 hover:text-slate-200">
            <Link2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
        </div>
      </div>
      {saveMessage && (
        <div className={`mb-3 rounded-xl border px-3 py-2 text-sm font-medium shadow-lg shadow-black/20 ${saveStatusPillClass[effectiveSaveStatus]}`}>
          <span className={`mr-2 inline-flex h-2 w-2 rounded-full ${saveStatusDotClass[effectiveSaveStatus]}`} />
          {saveMessage}
        </div>
      )}

      <Dialog open={deviceBridgeOpen} onOpenChange={setDeviceBridgeOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#111827] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-cyan-300" /> Run on Device
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="rounded-xl border border-white/10 bg-white p-4">
              <img src={deviceQrUrl} alt="Device preview QR code" className="h-44 w-44" />
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3">
                <div className="text-sm font-semibold text-cyan-100">Instant Deployment</div>
                <p className="mt-1 text-xs leading-5 text-cyan-50/75">
                  Scan this QR code on a phone or tablet to open the live project view. It uses the latest database snapshot and keeps AI context attached to the link.
                </p>
              </div>
              <Input value={devicePreviewUrl} readOnly className="border-white/10 bg-black/30 font-mono text-xs text-white" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  onClick={() => {
                    void navigator.clipboard.writeText(devicePreviewUrl).then(() => toast.success("Device link copied."));
                  }}
                  variant="ghost"
                  className="border border-white/10 text-slate-100 hover:bg-white/10"
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy device link
                </Button>
                <Button
                  onClick={() => {
                    setDeviceBridgeOpen(false);
                    setActiveTab("local-agent");
                  }}
                  className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                >
                  <MonitorUp className="mr-2 h-4 w-4" /> Open Terminal Agent
                </Button>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                For native command execution, install and connect the OCNE Desktop Agent. For mobile preview, the QR link opens the shared project page.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#111827] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-violet-300" /> Share Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["view", "View Only", "Share a read-focused snapshot link for review, demos, or support."],
                ["collab", "Collaborative", "Invite others into the live session with project AI context attached."],
              ] as const).map(([mode, title, text]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setShareMode(mode)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    shareMode === mode
                      ? "border-violet-400/50 bg-violet-500/10"
                      : "border-white/10 bg-black/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
              <div className="text-sm font-semibold text-emerald-100">AI Share</div>
              <p className="mt-1 text-xs leading-5 text-emerald-50/75">
                Shared links include project AI context, so the receiver can ask questions about the same files, snapshots, and Verlauf history.
              </p>
            </div>
            <Input value={shareUrl} readOnly className="border-white/10 bg-black/30 font-mono text-xs text-white" />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void createShareLink()} className="bg-violet-500 text-white hover:bg-violet-400">
                <Share2 className="mr-2 h-4 w-4" /> Create share link
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl).then(() => toast.success("Share link copied."));
                }}
                className="border border-white/10 text-slate-100 hover:bg-white/10"
              >
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 overflow-x-auto pb-1">
        <TabsList className="w-max border border-white/10 bg-[#101827]">
          <TabsTrigger value="editor" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <FileCode className="w-3.5 h-3.5 mr-1.5" /> Editor
          </TabsTrigger>
          <TabsTrigger value="together" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Together
          </TabsTrigger>
          <TabsTrigger value="reviews" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Reviews {reviews && reviews.length > 0 && `(${reviews.length})`}
          </TabsTrigger>
          <TabsTrigger value="versions" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <GitBranch className="w-3.5 h-3.5 mr-1.5" /> History
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Team
          </TabsTrigger>
          <TabsTrigger value="ai-agent" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <Bot className="w-3.5 h-3.5 mr-1.5" /> AI Agent
          </TabsTrigger>
          <TabsTrigger value="local-agent" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <MonitorUp className="w-3.5 h-3.5 mr-1.5" /> Terminal Agent
          </TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <Bug className="w-3.5 h-3.5 mr-1.5" /> Advanced
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="together" className="mt-0 min-h-0 flex-1 overflow-auto">
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="rounded-xl border border-cyan-400/20 bg-[#0c1624] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <Badge className="mb-3 bg-cyan-500/15 text-cyan-100">Together Coding</Badge>
                    <h2 className="text-2xl font-semibold text-white">Code in the same workspace, at the same time.</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Share a collaborative link, watch teammates appear in the live room, preview the app, and keep every save in Verlauf history.
                    </p>
                  </div>
                  <Button onClick={startTogetherCoding} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                    <Share2 className="mr-2 h-4 w-4" /> Start Together
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  {([
                    ["Mode", project?.collaborationMode === "solo" ? "Solo" : project?.collaborationMode === "team" ? "Team" : "Public", Users],
                    ["Live users", String(liveUsers.length), Radio],
                    ["Editors", String(editableCollaborators), ShieldCheck],
                    ["Snapshots", String(versions?.length || 0), GitBranch],
                  ] satisfies FeatureCard[]).map(([label, value, Icon]) => (
                    <div key={String(label)} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        <Icon className="h-3.5 w-3.5 text-cyan-300" /> {label}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Users className="h-4 w-4 text-cyan-300" /> Invite teammates
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Team mode lets invited collaborators join the same file with live presence and shared project context.
                  </p>
                  <Input value={togetherShareUrl} readOnly className="mt-3 border-white/10 bg-black/30 font-mono text-xs text-white" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3 border border-white/10 text-slate-100 hover:bg-white/10"
                    onClick={() => void navigator.clipboard.writeText(togetherShareUrl).then(() => toast.success("Together link copied."))}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copy invite link
                  </Button>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Monitor className="h-4 w-4 text-emerald-300" /> Live preview
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    HTML, CSS, and JavaScript files render inside the editor so everyone can review output while coding.
                  </p>
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                    {canShowPreview ? `Preview ready for ${activeFile?.name}` : "Select an HTML, CSS, or JavaScript file to preview."}
                  </div>
                  <Button size="sm" variant="ghost" className="mt-3 border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => setActiveTab("editor")}>
                    <Eye className="mr-2 h-4 w-4" /> Open preview panel
                  </Button>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <GitBranch className="h-4 w-4 text-violet-300" /> Verlauf history
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Every database save becomes a version snapshot with diff view and restore.
                  </p>
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                    Latest: {latestVersion ? `v${latestVersion.versionNumber}` : "No snapshot yet"}
                  </div>
                  <Button size="sm" variant="ghost" className="mt-3 border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => setActiveTab("versions")}>
                    <Clock className="mr-2 h-4 w-4" /> Open history
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Activity className="h-4 w-4 text-cyan-300" /> Session activity
                  </h3>
                  <Badge className={collaborationEnabled ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-300"}>
                    {collaborationEnabled ? "Live room on" : "Solo mode"}
                  </Badge>
                </div>
                {liveActivity.length === 0 ? (
                  <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-500">
                    Edits, file changes, and collaborator actions will appear here when the room is active.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {liveActivity.slice(0, 8).map((item) => (
                      <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        {activityText(item)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Radio className="h-4 w-4 text-emerald-300" /> Who is here
                </h3>
                <div className="mt-3 space-y-2">
                  {liveUsers.length === 0 ? (
                    <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-500">
                      No teammates are live yet. Copy the Together link to invite one.
                    </p>
                  ) : liveUsers.map((user, index) => (
                    <div key={user.userId} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b"][index % 4] }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs text-white">{user.name}</div>
                        <div className="truncate text-[10px] text-slate-500">{user.status} {user.activeFileName || "workspace"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <MessageSquare className="h-4 w-4 text-cyan-300" /> Quick note
                </h3>
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={liveChatMessage}
                    onChange={(event) => setLiveChatMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") sendLiveChat();
                    }}
                    placeholder="Ask the room..."
                    className="border-white/10 bg-white/[0.04] text-white"
                  />
                  <Button size="icon" onClick={() => sendLiveChat()} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <Database className="h-4 w-4" /> Cross-device save
                </h3>
                <p className="mt-2 text-xs leading-5 text-emerald-50/75">
                  Code is cached locally for speed and synced to the database after typing stops, so the same account can continue on another device.
                </p>
              </div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="editor" className="mt-0 min-h-0 flex-1 space-y-4 overflow-auto">
          <div className="grid min-h-[620px] gap-0 overflow-hidden rounded-xl border border-white/10 bg-[#0b0f19] xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          {/* File Explorer */}
          <div className="flex min-h-[260px] flex-col border-b border-white/10 bg-[#101827] lg:border-b-0 lg:border-r">
            <div className="flex min-h-11 items-center justify-between gap-1 border-b border-white/10 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Explorer</span>
              <Dialog open={createFileOpen} onOpenChange={setCreateFileOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openCreateDialog(null, "file")}
                    className="w-6 h-6 text-slate-500 hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#13131f] border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>{newItemType === "folder" ? "New Folder" : "New File"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Select value={newItemType} onValueChange={(value: "file" | "folder") => setNewItemType(value)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10">
                        <SelectItem value="file" className="text-white">File</SelectItem>
                        <SelectItem value="folder" className="text-white">Folder</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder={newItemType === "folder" ? "components" : "filename.js"}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <Select value={newParentId} onValueChange={setNewParentId}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10">
                        <SelectItem value="root" className="text-white">Project root</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={String(folder.id)} className="text-white">
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newItemType === "file" && (
                      <Select value={newFileLang} onValueChange={setNewFileLang}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-white/10">
                          {languages.map((l) => (
                            <SelectItem key={l} value={l} className="text-white">{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      onClick={handleCreateProjectItem}
                      disabled={createFile.isPending || !newFileName.trim()}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      {createFile.isPending ? "Creating..." : newItemType === "folder" ? "Create folder" : "Create file"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openCreateDialog(null, "folder")}
                className="w-6 h-6 text-slate-500 hover:text-white"
                title="New folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {files && files.length > 0 ? renderFileTree() : (
                <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-4 text-center text-xs leading-5 text-slate-500">
                  <FolderPlus className="mx-auto mb-2 h-5 w-5 text-slate-600" />
                  Create your first file or folder.
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="flex min-w-0 flex-col overflow-hidden bg-[#080b12]">
            <div className="flex min-h-10 items-center gap-3 border-b border-white/10 bg-[#101827] px-3">
              <span className="min-w-0 truncate text-xs text-slate-400">
                {activeFile?.name || "Select a file"}
              </span>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {activeFile && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleFormatDocument}
                      className="h-7 border border-white/10 px-2 text-[11px] text-slate-200 hover:bg-white/10"
                    >
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Format
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setWordWrapEnabled((enabled) => !enabled)}
                      className={`h-7 border px-2 text-[11px] hover:bg-white/10 ${wordWrapEnabled ? "border-cyan-400/30 text-cyan-300" : "border-white/10 text-slate-300"}`}
                    >
                      Wrap
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMinimapEnabled((enabled) => !enabled)}
                      className={`h-7 border px-2 text-[11px] hover:bg-white/10 ${minimapEnabled ? "border-cyan-400/30 text-cyan-300" : "border-white/10 text-slate-300"}`}
                    >
                      Map
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownloadFile}
                      className="h-7 border border-white/10 px-2 text-[11px] text-slate-200 hover:bg-white/10"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> File
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleResetDraft}
                      disabled={!isModified}
                      className="h-7 border border-white/10 px-2 text-[11px] text-slate-300 hover:bg-white/10 disabled:opacity-40"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                    </Button>
                  </>
                )}
                {activeFile && (
                  <Select
                    value={activeFile.language || "plaintext"}
                    onValueChange={(v) => {
                      saveIntentRef.current = "language";
                      setSaveStatus("saving");
                      saveFile.mutate({ id: activeFile.id, content: code, language: v });
                    }}
                  >
                    <SelectTrigger className="h-6 bg-white/5 border-white/10 text-white text-[11px] w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {languages.map((l) => (
                        <SelectItem key={l} value={l} className="text-white text-xs">{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Code area */}
              {activeFile ? (
                <div className="min-w-0 flex-1">
                  <CollaborativeCodeEditor
                    projectId={projectId!}
                    fileId={activeFile.id}
                    fileName={activeFile.name}
                    language={activeFile.language || "plaintext"}
                    value={code}
                    onChange={setCode}
                    collaborationEnabled={collaborationEnabled}
                    fontSize={editorFontSize}
                    minimapEnabled={minimapEnabled}
                    wordWrapEnabled={wordWrapEnabled}
                    onEditorReady={handleEditorReady}
                    onCursorLineChange={setReviewLineStart}
                    onConnectionStatusChange={setCollaborationStatus}
                  />
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-600">
                  <div>
                    <FileCode className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                    <p className="text-sm text-slate-400">Select a file from the explorer to start editing</p>
                    <p className="mt-2 text-xs text-slate-600">Use the plus buttons to create files and folders for this project.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex min-h-7 items-center gap-4 border-t border-white/10 bg-[#101827] px-3 text-[10px] text-slate-500">
              <span>{activeFile?.language || "plaintext"}</span>
              <span>{lines.length} lines</span>
              <span>{code.length} chars</span>
              <label className="ml-auto hidden items-center gap-1 sm:flex">
                <span>Font</span>
                <input
                  type="range"
                  min="12"
                  max="18"
                  value={editorFontSize}
                  onChange={(event) => setEditorFontSize(Number(event.target.value))}
                  className="w-20 accent-cyan-400"
                />
                <span>{editorFontSize}px</span>
              </label>
              <span
                title={saveStatusDetail[effectiveSaveStatus]}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold ${saveStatusPillClass[effectiveSaveStatus]}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${saveStatusDotClass[effectiveSaveStatus]}`} />
                {saveStatusText[effectiveSaveStatus]}
              </span>
            </div>
          </div>
          <aside className="flex min-h-[360px] flex-col border-t border-white/10 bg-[#101827] xl:border-l xl:border-t-0">
            <div className="border-b border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Live room</div>
                <Badge className={collaborationStatus === "connected" ? "bg-emerald-500/10 text-emerald-300" : collaborationStatus === "connecting" ? "bg-amber-500/10 text-amber-300" : "bg-slate-500/10 text-slate-300"}>
                  <Radio className="mr-1 h-3 w-3" /> {collaborationStatusText[collaborationStatus]}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["Online", String(liveUsers.length)],
                  ["Threads", String(openReviews)],
                  ["Version", latestVersion ? `v${latestVersion.versionNumber}` : "v0"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">{label}</div>
                    <div className="mt-1 truncate text-xs font-semibold text-white">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info("Voice rooms need a WebRTC/SFU provider before real calls can start.")}>
                  <Mic className="mr-2 h-4 w-4" /> Voice
                </Button>
                <Button size="sm" variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info("Video rooms need a WebRTC/SFU provider before real calls can start.")}>
                  <Video className="mr-2 h-4 w-4" /> Video
                </Button>
              </div>
            </div>

            <div className="space-y-3 border-b border-white/10 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Eye className="h-4 w-4 text-cyan-300" /> Follow mode
              </div>
              <Select value={followUserId || "off"} onValueChange={(value) => setFollowUserId(value === "off" ? null : value)}>
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  <SelectItem value="off" className="text-white">Follow nobody</SelectItem>
                  {liveUsers.map((user) => (
                    <SelectItem key={user.userId} value={user.userId} className="text-white">
                      Follow {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-slate-500">
                {followedUser ? `Ready to follow ${followedUser.name} while they teach or review.` : "Pick a leader so the session can sync file focus and view position."}
              </p>
            </div>

            <div className="space-y-3 border-b border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <GitBranch className="h-4 w-4 text-violet-300" /> Last steps
                </div>
                <Button size="sm" variant="ghost" className="h-7 border border-white/10 px-2 text-[11px] text-slate-200 hover:bg-white/10" onClick={() => setActiveTab("versions")}>
                  See all
                </Button>
              </div>
              {lastCodeSteps.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-500">
                  Save this file to create the first step.
                </p>
              ) : (
                <div className="space-y-2">
                  {lastCodeSteps.map((step, index) => {
                    const previous = lastCodeSteps[index + 1]?.version.content || "";
                    const authorName = authorNameFor(step);
                    const authorColor = stepColorFor(step.author?.id || step.version.userId);
                    return (
                      <button
                        key={step.version.id}
                        type="button"
                        onClick={() => {
                          setSelectedVersionId(step.version.id);
                          setActiveTab("versions");
                        }}
                        className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-left transition hover:border-violet-400/30 hover:bg-violet-500/10"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: authorColor, boxShadow: `0 0 10px ${authorColor}` }} />
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">v{step.version.versionNumber}</span>
                          <span className="text-[10px] text-slate-500">{new Date(step.version.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="mt-1 truncate text-[11px] text-slate-300">{step.version.commitMessage || "Save step"}</div>
                        <div className="mt-1 text-[10px] text-slate-500">
                          {authorName} - {codeStepSummary(previous, step.version.content || "")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-white">Participants</div>
                {liveUsers.length === 0 ? (
                  <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-500">
                    Collaborators appear here with color-coded Monaco cursors when they join this file.
                  </p>
                ) : liveUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b"][index % 4] }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-white">{user.name}</div>
                      <div className="truncate text-[10px] text-slate-500">{user.status} {user.activeFileName || "workspace"}</div>
                    </div>
                    <Badge variant="outline" className="border-white/10 text-[10px] text-slate-400">
                      {collaborators?.find((item) => item.collab.userId === user.userId)?.collab.role || "viewer"}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <MessageSquare className="h-4 w-4 text-cyan-300" /> Live chat
                </div>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
                  {liveChatMessages.length === 0 ? (
                    <p className="text-xs leading-5 text-slate-500">Chat and line annotations for this session appear here.</p>
                  ) : liveChatMessages.map((message) => (
                    <div key={message.id} className="text-xs leading-5 text-slate-300">
                      <span className="font-medium text-cyan-200">{message.author}</span>
                      {message.line && <span className="text-slate-500"> line {message.line}</span>}: {message.text}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={liveChatMessage}
                    onChange={(event) => setLiveChatMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") sendLiveChat();
                    }}
                    placeholder="Message or note..."
                    className="border-white/10 bg-white/[0.04] text-white"
                  />
                  <Button size="icon" onClick={() => sendLiveChat()} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="w-full border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => sendLiveChat(reviewLineStart || lines.length)}>
                  <StickyNote className="mr-2 h-4 w-4" /> Add line annotation
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Monitor className="h-4 w-4 text-emerald-300" /> Browser preview
                </div>
                <div className="aspect-video overflow-hidden rounded-lg border border-white/10 bg-white">
                  {canShowPreview ? (
                    <iframe title="Live preview" srcDoc={previewDocument} className="h-full w-full bg-white" sandbox="allow-scripts" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#0b0f19] p-3 text-center text-xs leading-5 text-slate-500">
                      Select an HTML, CSS, or JavaScript file to preview.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
          </div>
          {project?.localFilesEnabled ? (
            <DeviceEditorBridge
              projectName={project?.name}
              activeFileId={activeFileId}
              fileName={activeFile?.name}
              content={code}
              projectFiles={files || []}
              isLiveModified={isModified}
              isSavingLive={saveFile.isPending}
              onSaveLive={saveActiveFile}
              onImport={setCode}
              onImportProject={importDeviceProject}
              disabled={!activeFile}
            />
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100/80">
              Enable local files in Project Settings to sync this live editor with the user's device.
            </div>
          )}
          <div className="rounded-xl border border-white/5 bg-[#13131f] p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Shared Terminal</h3>
                <p className="text-xs text-slate-500">Run commands through the paired device agent and let collaborators see the workflow.</p>
              </div>
              {project?.collaborationMode !== "solo" && (
                <Badge className="bg-emerald-500/10 text-emerald-300">
                  <Radio className="mr-1 h-3 w-3" /> {liveUsers.length} live
                </Badge>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <EmbeddedTerminal compact title="Shared Terminal" />
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <Activity className="h-4 w-4 text-cyan-300" /> Live activity
                </div>
                {project?.collaborationMode === "solo" ? (
                  <p className="text-xs leading-5 text-slate-500">Switch this project to team or public mode to see live collaborators.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {liveUsers.length === 0 ? (
                        <p className="text-xs text-slate-500">No other active users yet.</p>
                      ) : liveUsers.map((user) => (
                        <div key={user.userId} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-100">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs text-white">{user.name}</div>
                            <div className="truncate text-[10px] text-slate-500">
                              {user.status} {user.activeFileName || "workspace"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      {liveActivity.length === 0 ? (
                        <p className="text-xs text-slate-500">Activity appears here as people work.</p>
                      ) : liveActivity.slice(0, 8).map((item) => (
                        <div key={item.id} className="mb-2 text-xs leading-5 text-slate-400">
                          <span className="text-slate-200">{activityText(item)}</span>
                          <div className="text-[10px] text-slate-600">{new Date(item.createdAt).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="flex-1 mt-0">
          <div className="h-full bg-[#13131f] border border-white/5 rounded-xl p-4 overflow-auto">
            {activeFile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    type="number"
                    placeholder="Line #"
                    className="w-20 bg-white/5 border-white/10 text-white text-sm"
                    value={reviewLineStart || ""}
                    onChange={(e) => setReviewLineStart(parseInt(e.target.value) || 0)}
                  />
                  <Input
                    placeholder="Add a review comment..."
                    className="flex-1 bg-white/5 border-white/10 text-white text-sm"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && reviewText.trim()) {
                        createReview.mutate({
                          projectId: projectId!,
                          fileId: activeFileId!,
                          lineStart: reviewLineStart,
                          content: reviewText,
                        });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => createReview.mutate({
                      projectId: projectId!,
                      fileId: activeFileId!,
                      lineStart: reviewLineStart,
                      content: reviewText,
                    })}
                    disabled={!reviewText.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    Comment
                  </Button>
                </div>
                {(reviews || []).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">No review comments yet. Start a discussion!</p>
                )}
                {(reviews || []).map((r) => (
                  <div key={r.review.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-[10px] text-white font-bold">
                        {r.author?.name?.charAt(0) || "U"}
                      </div>
                      <span className="text-xs text-slate-300">{r.author?.name || "User"}</span>
                      <Badge variant="outline" className="text-[10px] h-4 border-white/10 text-slate-500">
                        Line {r.review.lineStart || "?"}
                      </Badge>
                      <Badge
                        variant={r.review.status === "open" ? "default" : r.review.status === "resolved" ? "secondary" : "outline"}
                        className="text-[10px] h-4"
                      >
                        {r.review.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-300">{r.review.content}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.review.status !== "resolved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 border border-emerald-500/20 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() => updateReviewStatus.mutate({ id: r.review.id, status: "resolved" })}
                        >
                          Resolve
                        </Button>
                      )}
                      {r.review.status !== "open" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 border border-cyan-500/20 px-2 text-xs text-cyan-300 hover:bg-cyan-500/10"
                          onClick={() => updateReviewStatus.mutate({ id: r.review.id, status: "open" })}
                        >
                          Reopen
                        </Button>
                      )}
                      {r.review.status !== "dismissed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 border border-white/10 px-2 text-xs text-slate-300 hover:bg-white/10"
                          onClick={() => updateReviewStatus.mutate({ id: r.review.id, status: "dismissed" })}
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-16">Select a file to view reviews</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="versions" className="flex-1 mt-0">
          <div className="h-full bg-[#13131f] border border-white/5 rounded-xl p-4 overflow-auto">
            {activeFile ? (
              <div className="grid min-h-[620px] gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
                <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Clock className="h-4 w-4 text-cyan-300" /> Verlauf
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Every save creates a snapshot. Current code stays in the file table, while this timeline keeps who saved what and when.
                  </p>
                  <div className="mt-3 space-y-2">
                    {(versions || []).length === 0 && (
                      <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-500">
                        No version history yet. Save your file to create snapshots.
                      </p>
                    )}
                    {(versions || []).map((step, index) => {
                      const { version, author } = step;
                      const previous = versions?.[index + 1]?.version.content || "";
                      const authorName = authorNameFor(step);
                      const authorColor = stepColorFor(author?.id || version.userId);
                      return (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => setSelectedVersionId(version.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-all ${
                          selectedVersion?.version.id === version.id
                            ? "border-cyan-400/40 bg-cyan-500/10"
                            : "border-white/5 bg-white/[0.02] hover:border-cyan-500/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-slate-950" style={{ backgroundColor: authorColor }}>
                            v{version.versionNumber}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-slate-200">
                              {version.commitMessage || `Version ${version.versionNumber}`}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-600">
                              Saved by {authorName} at {new Date(version.createdAt).toLocaleString()}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {codeStepSummary(previous, version.content || "")}
                            </p>
                          </div>
                        </div>
                      </button>
                      );
                    })}
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#080b12]">
                  {selectedVersion ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#101827] px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            Diff: current code vs v{selectedVersion.version.versionNumber}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-slate-300"
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: stepColorFor(selectedVersion.author?.id || selectedVersion.version.userId) }}
                              />
                              {authorNameFor(selectedVersion)}
                            </span>
                            <span>{selectedVersion.version.commitMessage || "Snapshot"}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="border border-cyan-400/20 text-cyan-300 hover:bg-cyan-500/10"
                          onClick={() => {
                            if (confirm("Restore this version? A new snapshot will be created so no history is lost.")) {
                              restoreVersion.mutate({ versionId: selectedVersion.version.id });
                            }
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" /> Restore this version
                        </Button>
                      </div>
                      <div className="h-[560px]">
                        <DiffEditor
                          height="100%"
                          language={activeFile.language || "plaintext"}
                          original={selectedVersion.version.content || ""}
                          modified={code}
                          theme="vs-dark"
                          options={{
                            automaticLayout: true,
                            readOnly: true,
                            renderSideBySide: true,
                            minimap: { enabled: false },
                            fontSize: 13,
                            scrollBeyondLastLine: false,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center text-sm text-slate-500">
                      Select a snapshot to compare it with the current code.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-16">Select a file to view version history</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="collaborators" className="flex-1 mt-0">
          <div className="h-full bg-[#13131f] border border-white/5 rounded-xl p-4 overflow-auto">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" /> Project Collaborators
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Manage role-based access for editors, viewers, and admins.
                </p>
              </div>
              <Badge variant="outline" className="border-white/10 text-slate-400">
                {project?.collaborationMode === "solo" ? "Individual" : project?.collaborationMode === "team" ? "Invited team" : "Public collaboration"}
              </Badge>
            </div>
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              {([
                ["Admin", "Can manage files, settings, collaborators, and terminal access.", Crown],
                ["Editor", "Can create files, edit code, chat, annotate, and run allowed workflows.", FileCode],
                ["Viewer", "Can read code, follow sessions, join calls, and review without writing.", Eye],
              ] satisfies FeatureCard[]).map(([role, text, Icon]) => (
                <div key={String(role)} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Icon className="h-4 w-4 text-cyan-300" /> {role}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {(collaborators || []).map((c) => (
                <div key={c.collab.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-xs text-white font-bold">
                      {c.user?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">{c.user?.name || c.user?.username || "User"}</p>
                      <p className="text-[10px] text-slate-600">{c.collab.role}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-slate-500 text-[10px]">
                    {c.collab.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai-agent" className="flex-1 mt-0">
          <div className="grid h-full gap-4 overflow-auto lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-xl border border-white/5 bg-[#13131f] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Bot className="h-4 w-4 text-cyan-300" /> Project AI agent
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    The owner can enable this workspace per project. It is prepared for shared code review, planning, and project-aware suggestions.
                  </p>
                </div>
                <Badge className={project?.aiAgentEnabled ? "bg-cyan-500/15 text-cyan-200" : "bg-slate-500/15 text-slate-300"}>
                  {project?.aiAgentEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
                  <Sparkles className="h-4 w-4 text-amber-300" /> Context available
                </div>
                <div>Project: {project?.name}</div>
                <div>Mode: {project?.collaborationMode || "solo"}</div>
                <div>Active file: {activeFile?.name || "No file selected"}</div>
                <div>Local files: {project?.localFilesEnabled ? "Allowed after desktop pairing" : "Off for this project"}</div>
                <div>Snapshots indexed: {versions?.length || 0}</div>
                <div>Open review threads: {openReviews}</div>
              </div>
              <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                disabled={!project?.aiAgentEnabled}
                className="mt-4 min-h-36 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={project?.aiAgentEnabled ? "Ask the project agent to review, explain, or plan changes..." : "Enable the AI agent in Project Settings first."}
              />
              <Button
                disabled={!project?.aiAgentEnabled || !aiPrompt.trim()}
                className="mt-3 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                onClick={() => toast.info("AI provider wiring is ready here. Connect your AI backend/API key to return real code suggestions.")}
              >
                <Bot className="mr-2 h-4 w-4" /> Ask agent
              </Button>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  "Where is the API logic located and how do I use it?",
                  "The login stopped working after the last three saves. What changed?",
                  "Write code that matches this project's naming style.",
                  "Generate a clear save summary for the Verlauf.",
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    size="sm"
                    variant="ghost"
                    disabled={!project?.aiAgentEnabled}
                    className="h-auto justify-start whitespace-normal border border-white/10 px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/10"
                    onClick={() => setAiPrompt(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <Database className="h-4 w-4" /> Private project database intelligence
                </div>
                <p className="mt-2 text-xs leading-5 text-emerald-50/75">
                  The AI workspace is designed to learn from this project's files, snapshots, review threads, and metadata only. Proprietary code stays project-scoped and is not presented as training data for a public model.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    ["Instant Project Familiarity", "Ask where logic lives instead of reading every file first."],
                    ["AI-Powered Time Travel", "Compare snapshots and identify the save that introduced a regression."],
                    ["Context-Aware Intelligence", "Suggest code that follows local libraries, names, and patterns."],
                    ["Frictionless Documentation", "Generate save summaries and clean Verlauf entries automatically."],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-lg border border-emerald-200/10 bg-black/20 p-3">
                      <div className="text-xs font-semibold text-emerald-100">{title}</div>
                      <p className="mt-1 text-xs leading-5 text-emerald-50/65">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Wand2 className="h-4 w-4 text-violet-300" /> Collaborative AI autocomplete
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  The editor is prepared for team-aware suggestions that read the active file, project structure, and collaboration mode before proposing code.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!project?.aiAgentEnabled || !activeFile}
                  className="mt-3 border border-white/10 text-slate-100 hover:bg-white/10"
                  onClick={() => toast.info("Autocomplete UI is ready. Connect the AI completion endpoint to stream suggestions into Monaco.")}
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Suggest next code
                </Button>
              </div>
              <div className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <Workflow className="h-4 w-4" /> Autonomous debugging agent
                </div>
                <p className="mt-2 text-xs leading-5 text-cyan-50/75">
                  A Cascade-style agent can inspect project files, explain failures, propose patches, and run approved terminal commands through the device agent.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {["Scan repo", "Plan fix", "Run tests"].map((action) => (
                    <Button key={action} size="sm" variant="ghost" disabled={!project?.aiAgentEnabled} className="border border-cyan-200/20 text-cyan-50 hover:bg-cyan-200/10" onClick={() => toast.info(`${action} will require the repo-level AI agent executor and approval policy.`)}>
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-violet-400/20 bg-violet-400/10 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-100">
                  <Sparkles className="h-4 w-4" /> Vibe coding builder
                </div>
                <p className="mt-2 text-xs leading-5 text-violet-50/75">
                  Chat in natural language to generate full components, database models, routes, and deployment steps as one coordinated workspace change.
                </p>
                <Button size="sm" disabled={!project?.aiAgentEnabled} className="mt-3 bg-violet-500 text-white hover:bg-violet-400" onClick={() => toast.info("Vibe coding needs multi-file write tools, review diffs, and rollback before auto-applying changes.")}>
                  <Wand2 className="mr-2 h-4 w-4" /> Build from prompt
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#0d0d12] p-4">
              <h3 className="text-sm font-semibold text-white">Collaboration flow</h3>
              <div className="mt-4 grid gap-3 text-sm">
                {[
                  ["Individual", "Solo mode keeps editing private to the owner."],
                  ["Together", "Team mode uses project collaborators as editors or viewers."],
                  ["Public", "Public collaboration lets visible projects accept wider participation rules."],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="font-medium text-white">{title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{text}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <GitPullRequest className="h-4 w-4 text-emerald-300" /> One-click Git integration
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Prepare a live session for GitHub, GitLab, or Bitbucket by saving the project first, then pushing through a connected provider.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {["GitHub", "GitLab", "Bitbucket"].map((provider) => (
                    <Button key={provider} size="sm" variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info(`${provider} connection needs OAuth setup before pushing.`)}>
                      {provider}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Video className="h-4 w-4 text-cyan-300" /> Built-in communication suite
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Add production-grade voice, video, screen sharing, and session moderation directly inside the collaboration room.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {["Voice rooms", "Video rooms", "Screen share"].map((item) => (
                    <Button key={item} size="sm" variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info(`${item} needs WebRTC/SFU infrastructure before production use.`)}>
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="local-agent" className="flex-1 mt-0 overflow-auto">
          {project?.localFilesEnabled ? (
            <Suspense
              fallback={
                <div className="rounded-xl border border-white/10 bg-[#13131f] p-5 text-sm text-slate-400">
                  Loading terminal agent...
                </div>
              }
            >
              <LocalAgentPage />
            </Suspense>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
              <div className="flex items-center gap-2 font-semibold">
                <HardDrive className="h-4 w-4" /> Local file access is off for this project
              </div>
              <p className="mt-2 text-xs leading-5 text-amber-100/80">
                Enable local file access in Project Settings before using the desktop terminal agent with this project.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="flex-1 mt-0 overflow-auto">
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Bug className="h-4 w-4 text-cyan-300" /> Shared debugging console
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Coordinate breakpoints, stepping, watched variables, and stack traces for everyone in the session.
                    </p>
                  </div>
                  <Badge className="bg-cyan-500/10 text-cyan-200">debug session</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {([
                    ["Breakpoints", activeFile ? `${activeFile.name}: line ${reviewLineStart || 1}` : "Select a file first", Bug],
                    ["Step control", "Step over, into, out", Play],
                    ["Variables", "Inspect shared runtime state", Eye],
                  ] satisfies FeatureCard[]).map(([title, text, Icon]) => (
                    <div key={String(title)} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <Icon className="h-4 w-4 text-cyan-300" /> {title}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Add breakpoint", "Step over", "Inspect variables"].map((action) => (
                    <Button key={action} size="sm" variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info(`${action} needs a debugger adapter service before it can run.`)}>
                      {action}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Archive className="h-4 w-4 text-emerald-300" /> Environment snapshots
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Save installed libraries, open files, terminal command history, and active collaboration state to resume later.
                    </p>
                  </div>
                  <Button size="sm" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => toast.info("Snapshot metadata UI is ready. Persisting terminal/container state needs backend storage.")}>
                    <Camera className="mr-2 h-4 w-4" /> Save snapshot
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {([
                    ["Libraries", "package.json, lockfiles, Python requirements", Package],
                    ["Open files", activeFile?.name || "No active file", FileCode],
                    ["Terminal", "Last commands and output streams", MonitorUp],
                  ] satisfies FeatureCard[]).map(([title, text, Icon]) => (
                    <div key={String(title)} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <Icon className="mb-2 h-4 w-4 text-emerald-300" />
                      <div className="text-xs font-semibold text-white">{title}</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Box className="h-4 w-4 text-violet-300" /> Docker container support
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Start the same reproducible OS and runtime for every collaborator.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    ["Node.js", "node:20 + npm", "npm install && npm run dev"],
                    ["Python", "python:3.12 + pip", "pip install -r requirements.txt"],
                    ["Go", "golang:1.23", "go test ./..."],
                  ].map(([name, image, command]) => (
                    <div key={name} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-sm font-semibold text-white">{name}</div>
                      <div className="mt-1 font-mono text-[10px] text-slate-500">{image}</div>
                      <Button size="sm" variant="ghost" className="mt-3 w-full border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info(`${command} will be available after container orchestration is connected.`)}>
                        <Box className="mr-2 h-4 w-4" /> Start
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Cloud className="h-4 w-4 text-sky-300" /> Multi-cloud and hybrid deployment
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Deploy consistently to cloud providers or private servers from the same live workspace.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {([
                    ["AWS", Cloud],
                    ["Azure", Server],
                    ["Google Cloud", Database],
                    ["On-prem", HardDrive],
                  ] satisfies ProviderCard[]).map(([provider, Icon]) => (
                    <Button key={String(provider)} variant="ghost" className="justify-start border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info(`${provider} deployment needs provider credentials, build recipes, and policy checks.`)}>
                      <Icon className="mr-2 h-4 w-4 text-sky-300" /> {provider}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <WifiOff className="h-4 w-4 text-emerald-300" /> Offline mode with local computation
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Keep working after a project loads by caching files locally and running computation through the desktop agent when the network drops.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {["Cache project", "Local terminal", "Sync when online"].map((item) => (
                    <div key={item} className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs font-medium text-slate-200">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <GitMerge className="h-4 w-4 text-amber-300" /> Conflict resolution engine
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Warn when multiple users edit the same block and suggest safe merges before conflicts spread.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                    <div className="text-xs font-semibold text-amber-100">Current risk</div>
                    <p className="mt-1 text-xs leading-5 text-amber-100/75">
                      {liveUsers.length > 1 ? `${liveUsers.length} users active. Same-block detection is ready for CRDT range metadata.` : "Low. Only one visible active editor."}
                    </p>
                  </div>
                  <Button variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info("Merge suggestions need edit-range analytics from the collaboration provider.")}>
                    <GitMerge className="mr-2 h-4 w-4" /> Analyze edits
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <LockKeyhole className="h-4 w-4 text-red-300" /> Zero-trust session security
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Every file read, terminal run, AI action, and deployment step should be authenticated, authorized, and logged.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    ["Identity", "Verify every user and paired device"],
                    ["Authorization", "Check role, file, terminal, and deploy permissions"],
                    ["Audit", "Record sensitive actions for owners"],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs font-semibold text-white">{title}</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldAlert className="h-4 w-4 text-amber-300" /> Policy as code
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Run security, compliance, and cost checks before code, infrastructure, or containers go live.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Security scan", "Cost guardrails", "Deploy approval"].map((policy) => (
                    <Button key={policy} size="sm" variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info(`${policy} needs a policy engine and deployment pipeline integration.`)}>
                      {policy}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Trophy className="h-4 w-4 text-yellow-300" /> Challenge mode
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Leaders can create timed tasks with a live leaderboard for learners or teams.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_110px]">
                  <Input placeholder="Build a responsive navbar" className="border-white/10 bg-white/[0.04] text-white" />
                  <Input value={challengeMinutes} onChange={(event) => setChallengeMinutes(event.target.value)} className="border-white/10 bg-white/[0.04] text-white" />
                </div>
                <Button className="mt-3 bg-yellow-400 text-slate-950 hover:bg-yellow-300" onClick={() => toast.info(`Challenge mode is staged for ${challengeMinutes || 30} minutes. Backend scoring comes next.`)}>
                  <Timer className="mr-2 h-4 w-4" /> Start challenge
                </Button>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <GraduationCap className="h-4 w-4 text-cyan-300" /> Collaborative bootcamp mode
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Host instructor-led rooms for large groups with follow mode, read-only learners, challenges, Q&A, and session playback.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Capacity", "50+ guests"],
                    ["Mode", "Instructor led"],
                    ["Learners", "View/comment first"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-3 border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info("Bootcamp mode needs room scaling, instructor permissions, and attendance tracking.")}>
                  <GraduationCap className="mr-2 h-4 w-4" /> Prepare bootcamp
                </Button>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <RotateCcw className="h-4 w-4 text-cyan-300" /> Code playback
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Generate a time-lapse of the coding session for students, reviews, and replay.
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/5 bg-cyan-400" />
                </div>
                <Button size="sm" variant="ghost" className="mt-3 border border-white/10 text-slate-100 hover:bg-white/10" onClick={() => toast.info("Playback needs operation-log storage from the collaboration service.")}>
                  <Play className="mr-2 h-4 w-4" /> Preview playback
                </Button>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <PenTool className="h-4 w-4 text-pink-300" /> Whiteboard
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Sketch architecture, UI layouts, or debugging diagrams beside the code.
                </p>
                <div className="mt-4 aspect-video rounded-lg border border-dashed border-white/10 bg-black/20 p-3">
                  <div className="h-full rounded border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:18px_18px]" />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <BarChart3 className="h-4 w-4 text-emerald-300" /> Session analytics
                </h3>
                <div className="mt-4 grid gap-3">
                  {[
                    ["Lines changed", String(lines.length)],
                    ["Active files", String(files?.filter((file) => file.type === "file").length || 0)],
                    ["Live users", String(liveUsers.length)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-3">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className="text-sm font-semibold text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Smartphone className="h-4 w-4 text-cyan-300" /> Mobile companion
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  A mobile-friendly companion view can follow the session, comment, and review while away from the computer.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13131f] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Library className="h-4 w-4 text-violet-300" /> Custom snippet library
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input value={snippetDraft} onChange={(event) => setSnippetDraft(event.target.value)} placeholder="Save boilerplate or helper code..." className="border-white/10 bg-white/[0.04] text-white" />
                  <Button onClick={() => {
                    toast.success(snippetDraft ? "Snippet staged for this project." : "Write a snippet first.");
                    setSnippetDraft("");
                  }} className="bg-violet-500 text-white hover:bg-violet-400">
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 mt-0">
          <div className="h-full overflow-auto rounded-xl border border-white/5 bg-[#13131f] p-4">
            <h3 className="text-sm font-semibold text-white">Project Settings</h3>
            <p className="mt-1 text-xs text-slate-500">Control AI help, local-file access, and how people collaborate on this project.</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <label className="mb-2 block text-sm font-medium text-white">Project visibility</label>
                <Select
                  value={effectiveProjectVisibility}
                  onValueChange={(value: ProjectVisibility) => {
                    const selectedFriendIds = value === "selected" ? effectiveSelectedFriendIds : [];
                    updateProject.mutate({ id: projectId!, projectVisibility: value, selectedFriendIds });
                  }}
                >
                  <SelectTrigger className="border-white/10 bg-white/5 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    {projectVisibilityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {projectVisibilityOptions.find((option) => option.value === effectiveProjectVisibility)?.help}
                </p>
                {effectiveProjectVisibility === "selected" && (
                  <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    {acceptedFriends.length === 0 ? (
                      <p className="text-xs text-slate-500">Add accepted friends first, then select who can open this project.</p>
                    ) : acceptedFriends.map((friend) => {
                      const friendId = friend.user!.id;
                      const checked = effectiveSelectedFriendIds.includes(friendId);
                      return (
                        <label key={friend.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-white/[0.04]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const nextIds = event.target.checked
                                ? [...effectiveSelectedFriendIds, friendId]
                                : effectiveSelectedFriendIds.filter((id) => id !== friendId);
                              setSelectedFriendDraft(nextIds);
                              updateProject.mutate({ id: projectId!, projectVisibility: "selected", selectedFriendIds: nextIds });
                            }}
                            className="h-4 w-4 rounded border-white/20"
                          />
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-xs font-semibold text-white">
                            {(friend.user?.name || friend.user?.username || "U").charAt(0).toUpperCase()}
                          </span>
                          <span>{friend.user?.name || friend.user?.username || "OCNE friend"}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <label className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-3">
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium text-white">
                    <Bot className="h-4 w-4 text-cyan-300" /> Enable AI agent
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">Shows the project AI workspace for planning, reviews, and future code edits.</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(project?.aiAgentEnabled)}
                  onChange={(event) => updateProject.mutate({ id: projectId!, aiAgentEnabled: event.target.checked })}
                  className="mt-1 h-4 w-4"
                />
              </label>
              <label className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-3">
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium text-white">
                    <HardDrive className="h-4 w-4 text-emerald-300" /> Allow local files
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">Allows this project to use the paired OCNE Desktop Agent terminal on the user's computer.</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(project?.localFilesEnabled)}
                  onChange={(event) => updateProject.mutate({ id: projectId!, localFilesEnabled: event.target.checked })}
                  className="mt-1 h-4 w-4"
                />
              </label>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <label className="mb-2 block text-sm font-medium text-white">Collaboration mode</label>
                <Select
                  value={project?.collaborationMode || "solo"}
                  onValueChange={(value: "solo" | "team" | "public") => updateProject.mutate({ id: projectId!, collaborationMode: value })}
                >
                  <SelectTrigger className="border-white/10 bg-white/5 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    <SelectItem value="solo" className="text-white">Solo workspace</SelectItem>
                    <SelectItem value="team" className="text-white">Invite collaborators</SelectItem>
                    <SelectItem value="public" className="text-white">Public collaboration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
