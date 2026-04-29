import { useState, useEffect, useRef } from "react";
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
import { toast } from "sonner";
import {
  FileCode, Folder, Save, Play, MessageSquare,
  Plus, Trash2, Clock,
  Users, ArrowLeft, Share2, GitBranch
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
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewLineStart, setReviewLineStart] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  const { data: project } = trpc.project.get.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );
  const { data: files } = trpc.project.fileList.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: versions } = trpc.project.versions.useQuery(
    { fileId: activeFileId! },
    { enabled: !!activeFileId }
  );
  const { data: reviews } = trpc.review.list.useQuery(
    { fileId: activeFileId! },
    { enabled: !!activeFileId }
  );
  const { data: collaborators } = trpc.project.collaborators.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  const saveFile = trpc.project.fileUpdate.useMutation({
    onSuccess: () => {
      toast.success("File saved!");
      setOriginalCode(code);
      utils.project.fileList.invalidate({ projectId: projectId! });
      utils.project.versions.invalidate({ fileId: activeFileId! });
    },
  });

  const createFile = trpc.project.fileCreate.useMutation({
    onSuccess: () => {
      toast.success("File created!");
      utils.project.fileList.invalidate({ projectId: projectId! });
      setCreateFileOpen(false);
      setNewFileName("");
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

  const activeFile = files?.find((f) => f.id === activeFileId);

  useEffect(() => {
    if (activeFile) {
      setCode(activeFile.content || "");
      setOriginalCode(activeFile.content || "");
    }
  }, [activeFile?.id]);

  const handleSave = () => {
    if (!activeFileId) return;
    saveFile.mutate({ id: activeFileId, content: code, language: activeFile?.language || "plaintext" });
  };

  const handleRun = () => {
    toast.info("Running code in browser... (Simulated execution)");
  };

  const isModified = code !== originalCode;

  // Line numbers for the textarea
  const lines = code.split("\n");
  const lineCount = lines.length;

  const handleLineClick = (lineNum: number) => {
    setReviewLineStart(lineNum);
  };

  if (!projectId) {
    // Show project selector when no project ID
    const { data: allProjects } = trpc.project.list.useQuery();
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white">Code Editor</h1>
          <p className="text-slate-400 text-sm">Select a project to start editing</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(allProjects?.owned || []).map((p) => (
            <Card
              key={p.id}
              className="bg-[#13131f] border-white/5 hover:border-cyan-500/20 cursor-pointer p-5"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-lg">
                  {p.language?.charAt(0)?.toUpperCase() || "📄"}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                  <p className="text-xs text-slate-500">{p.language}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-white">{project?.name || "Editor"}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] h-5">
                {activeFile?.language || project?.language || "plaintext"}
              </Badge>
              {isModified && (
                <span className="text-amber-400">● Modified</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!isModified || saveFile.isPending}
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
          >
            <Save className="w-4 h-4 mr-1.5" /> Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRun}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
          >
            <Play className="w-4 h-4 mr-1.5" /> Run
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400">
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="bg-[#13131f] border border-white/5 w-fit mb-2">
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
        </TabsList>

        <TabsContent value="editor" className="flex-1 mt-0 space-y-4">
          <div className="flex gap-0">
          {/* File Explorer */}
          <div className="w-56 bg-[#13131f] border border-white/5 rounded-l-xl overflow-hidden flex flex-col">
            <div className="h-10 flex items-center justify-between px-3 border-b border-white/5">
              <span className="text-[10px] uppercase font-semibold text-slate-600 tracking-wider">Explorer</span>
              <Dialog open={createFileOpen} onOpenChange={setCreateFileOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-white">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#13131f] border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>New File</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Input
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="filename.js"
                      className="bg-white/5 border-white/10 text-white"
                    />
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
                    <Button
                      onClick={() => createFile.mutate({
                        projectId: projectId!,
                        name: newFileName,
                        type: "file",
                        language: newFileLang,
                      })}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {(files || []).map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-all ${
                    activeFileId === file.id
                      ? "bg-cyan-500/10 text-cyan-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                  onClick={() => setActiveFileId(file.id)}
                >
                  {file.type === "folder" ? (
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span className="truncate">{file.name}</span>
                  {activeFileId === file.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFile.mutate({ id: file.id }); }}
                      className="ml-auto text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 bg-[#0d0d12] border border-white/5 rounded-r-xl overflow-hidden flex flex-col">
            <div className="h-9 flex items-center px-3 border-b border-white/5 bg-[#13131f]">
              <span className="text-xs text-slate-500">
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
            <div className="flex-1 flex overflow-hidden">
              {/* Line numbers */}
              <div className="w-12 bg-[#0d0d12] border-r border-white/5 py-4 text-right pr-2 select-none overflow-hidden">
                {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
                  <div
                    key={i}
                    className="text-[11px] text-slate-700 leading-6 cursor-pointer hover:text-slate-400"
                    onClick={() => handleLineClick(i + 1)}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Code area */}
              {activeFile ? (
                <textarea
                  ref={editorRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="flex-1 bg-transparent text-[13px] text-[#d4d4d4] font-mono leading-6 p-4 resize-none outline-none border-none whitespace-pre"
                  placeholder="// Start coding..."
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600">
                  <p className="text-sm">Select a file from the explorer to start editing</p>
                </div>
              )}
            </div>
            <div className="h-7 flex items-center px-3 border-t border-white/5 bg-[#13131f] text-[10px] text-slate-600 gap-4">
              <span>{activeFile?.language || "plaintext"}</span>
              <span>{lines.length} lines</span>
              <span>{code.length} chars</span>
              {isModified && <span className="text-amber-400">unsaved</span>}
            </div>
          </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#13131f] p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Editor Terminal</h3>
              <p className="text-xs text-slate-500">Use the same in-app terminal without leaving the editor.</p>
            </div>
            <EmbeddedTerminal compact title="Editor Terminal" />
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
            <h3 className="text-sm font-semibold text-white mb-4">Project Collaborators</h3>
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
      </Tabs>
    </div>
  );
}
