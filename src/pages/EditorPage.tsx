import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
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
import LocalAgentPage from "@/pages/LocalAgentPage";
import { toast } from "sonner";
import {
  FileCode, Folder, Save, Play, MessageSquare,
  Plus, Trash2, Clock,
  Users, ArrowLeft, Share2, GitBranch, Bot, HardDrive, Settings, Sparkles, MonitorUp,
  ChevronDown, ChevronRight, FolderPlus, Radio, Activity, Mic, Video, Eye, StickyNote,
  Monitor, ShieldCheck, Wand2, GitPullRequest, Send, Crown
} from "lucide-react";

const languages = [
  "plaintext", "javascript", "typescript", "python", "php",
  "java", "csharp", "html", "css", "go", "rust", "ruby", "sql", "json", "markdown",
];

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ? parseInt(id) : undefined;

  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [originalCode, setOriginalCode] = useState("");
  const [activeTab, setActiveTab] = useState("editor");
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

  const utils = trpc.useUtils();

  const { data: project } = trpc.project.get.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );
  const { data: files } = trpc.project.fileList.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId,
      refetchInterval: project?.collaborationMode && project.collaborationMode !== "solo" ? 2000 : false,
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
      refetchInterval: project?.collaborationMode && project.collaborationMode !== "solo" ? 3000 : false,
    }
  );
  const { data: collaborators } = trpc.project.collaborators.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId,
      refetchInterval: project?.collaborationMode && project.collaborationMode !== "solo" ? 5000 : false,
    }
  );
  const { data: liveState } = trpc.project.liveState.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId && Boolean(project?.collaborationMode && project.collaborationMode !== "solo"),
      refetchInterval: 2500,
    }
  );
  const heartbeat = trpc.project.heartbeat.useMutation();

  const saveFile = trpc.project.fileUpdate.useMutation({
    onSuccess: () => {
      toast.success("File saved!");
      setOriginalCode(code);
      utils.project.fileList.invalidate({ projectId: projectId! });
      utils.project.versions.invalidate({ fileId: activeFileId! });
    },
  });

  const createFile = trpc.project.fileCreate.useMutation({
    onSuccess: (data) => {
      toast.success(newItemType === "folder" ? "Folder created!" : "File created!");
      utils.project.fileList.invalidate({ projectId: projectId! });
      if (newItemType === "folder" && data.id) {
        setExpandedFolders((folders) => new Set([...folders, data.id]));
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

  const deleteFile = trpc.project.fileDelete.useMutation({
    onSuccess: () => {
      toast.success("File deleted!");
      utils.project.fileList.invalidate({ projectId: projectId! });
      setActiveFileId(null);
      setCode("");
    },
  });

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      toast.success("Project settings saved");
      utils.project.get.invalidate({ id: projectId! });
      utils.project.list.invalidate();
    },
  });

  const activeFile = files?.find((f) => f.id === activeFileId);
  const isModified = code !== originalCode;
  const folders = (files || []).filter((item) => item.type === "folder");
  const liveUsers = liveState?.users || [];
  const liveActivity = liveState?.activity || [];
  const followedUser = liveUsers.find((user) => user.userId === followUserId);
  const canShowPreview = ["html", "css", "javascript"].includes(activeFile?.language || "");
  const previewDocument = activeFile?.language === "html"
    ? code
    : `<!doctype html><html><head><style>${activeFile?.language === "css" ? code : ""}</style></head><body><div id="app"></div><script>${activeFile?.language === "javascript" ? code : ""}</script></body></html>`;

  useEffect(() => {
    if (activeFile) {
      setCode(activeFile.content || "");
      setOriginalCode(activeFile.content || "");
    }
  }, [activeFile?.id]);

  useEffect(() => {
    if (activeFile && !isModified) {
      setCode(activeFile.content || "");
      setOriginalCode(activeFile.content || "");
    }
  }, [activeFile?.updatedAt]);

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
  }, [projectId, project?.collaborationMode, activeFileId, activeFile?.name, isModified]);

  const handleSave = () => {
    if (!activeFileId) return;
    saveFile.mutate({ id: activeFileId, content: code, language: activeFile?.language || "plaintext" });
  };

  useEffect(() => {
    if (!activeFileId || !activeFile || !isModified || saveFile.isPending) return;
    if (!project?.collaborationMode || project.collaborationMode === "solo") return;

    const timer = window.setTimeout(() => {
      saveFile.mutate({ id: activeFileId, content: code, language: activeFile.language || "plaintext" });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [activeFileId, activeFile?.language, code, isModified, project?.collaborationMode, saveFile.isPending]);

  const handleRun = () => {
    setActiveTab("terminal");
    toast.info("Use the Terminal Agent panel to run this project on the connected computer.");
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

  const renderFileTree = (parentId: number | null = null, depth = 0): JSX.Element[] => {
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
                setActiveFileId(item.id);
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
    const { data: allProjects } = trpc.project.list.useQuery();
    const ownedProjects = allProjects?.owned || [];
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
        {ownedProjects.length === 0 ? (
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
          {ownedProjects.map((p) => (
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
              {isModified && (
                <span className="text-amber-400">● Modified</span>
              )}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!isModified || saveFile.isPending}
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
          >
            <Save className="w-4 h-4 mr-1.5" /> Save live
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRun}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
          >
            <Play className="w-4 h-4 mr-1.5" /> Run on device
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400">
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 overflow-x-auto pb-1">
        <TabsList className="w-max border border-white/10 bg-[#101827]">
          <TabsTrigger value="editor" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <FileCode className="w-3.5 h-3.5 mr-1.5" /> Editor
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
          <TabsTrigger value="settings" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
          </TabsTrigger>
        </TabsList>
        </div>

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
              <div className="ml-auto flex items-center gap-2">
                {activeFile && (
                  <Select
                    value={activeFile.language || "plaintext"}
                    onValueChange={(v) => saveFile.mutate({ id: activeFile.id, content: code, language: v })}
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
              {isModified && <span className="text-amber-400">unsaved</span>}
            </div>
          </div>
          <aside className="flex min-h-[360px] flex-col border-t border-white/10 bg-[#101827] xl:border-l xl:border-t-0">
            <div className="border-b border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Live room</div>
                <Badge className={project?.collaborationMode === "solo" ? "bg-slate-500/10 text-slate-300" : "bg-emerald-500/10 text-emerald-300"}>
                  <Radio className="mr-1 h-3 w-3" /> {liveUsers.length} online
                </Badge>
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
              onSaveLive={handleSave}
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
              <div className="space-y-2">
                <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Clock className="h-4 w-4 text-cyan-300" /> Time-travel versioning
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Every save creates a point in the file timeline. The next step is whole-project restore, but file restore is already available below.
                  </p>
                </div>
                {(versions || []).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">No version history yet. Save your file to create versions.</p>
                )}
                {(versions || []).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold">
                        v{v.versionNumber}
                      </div>
                      <div>
                        <p className="text-sm text-slate-300">Version {v.versionNumber}</p>
                        <p className="text-[10px] text-slate-600">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(v.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-cyan-400 hover:text-cyan-300"
                      onClick={() => {
                        if (confirm("Restore this version? Current content will be overwritten.")) {
                          trpc.project.restoreVersion.useMutation({
                            onSuccess: () => {
                              toast.success("Version restored!");
                              utils.project.fileList.invalidate({ projectId: projectId! });
                              utils.project.versions.invalidate({ fileId: activeFileId! });
                            },
                          }).mutate({ versionId: v.id });
                        }
                      }}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
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
              {[
                ["Admin", "Can manage files, settings, collaborators, and terminal access.", Crown],
                ["Editor", "Can create files, edit code, chat, annotate, and run allowed workflows.", FileCode],
                ["Viewer", "Can read code, follow sessions, join calls, and review without writing.", Eye],
              ].map(([role, text, Icon]) => (
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
            </div>
          </div>
        </TabsContent>

        <TabsContent value="local-agent" className="flex-1 mt-0 overflow-auto">
          {project?.localFilesEnabled ? (
            <LocalAgentPage />
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

        <TabsContent value="settings" className="flex-1 mt-0">
          <div className="h-full overflow-auto rounded-xl border border-white/5 bg-[#13131f] p-4">
            <h3 className="text-sm font-semibold text-white">Project Settings</h3>
            <p className="mt-1 text-xs text-slate-500">Control AI help, local-file access, and how people collaborate on this project.</p>
            <div className="mt-4 grid gap-3">
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
