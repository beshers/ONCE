import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/lib/trpcClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FolderOpen, Plus, Search, Globe, Lock,
  Clock, Code2, Star, Bot, HardDrive, UserRound, Users
} from "lucide-react";

const languageIcons: Record<string, string> = {
  javascript: "⚡", typescript: "📘", python: "🐍", php: "🐘",
  csharp: "💠", java: "☕", html: "🌐", css: "🎨", go: "🐹",
  rust: "🦀", ruby: "💎", plaintext: "📄",
};

const starterCode: Record<string, string> = {
  javascript: '// JavaScript Project\nconsole.log("Hello, World!");\n',
  typescript: '// TypeScript Project\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);\n',
  python: '# Python Project\nprint("Hello, World!")\n',
  php: '<?php\n// PHP Project\necho "Hello, World!";\n',
  csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  html: '<!DOCTYPE html>\n<html>\n<head><title>New Project</title></head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n',
  css: '/* CSS Project */\nbody {\n  font-family: sans-serif;\n  background: #0a0a0f;\n  color: #e2e8f0;\n}\n',
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: projects, isLoading } = trpc.project.list.useQuery();
  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      setCreateOpen(false);
    },
  });

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    language: "javascript",
    isPublic: true,
    aiAgentEnabled: false,
    localFilesEnabled: false,
    collaborationMode: "solo" as "solo" | "team" | "public",
  });

  const allProjects = [
    ...(projects?.owned || []),
    ...(projects?.collaborated || []),
  ];

  const filtered = search
    ? allProjects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(search.toLowerCase())
      )
    : allProjects;

  const handleCreate = () => {
    if (!newProject.name.trim()) return;
    createProject.mutate({
      ...newProject,
      initialCode: starterCode[newProject.language] || "",
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 text-sm">Manage your coding projects</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#13131f] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-cyan-400" /> New Project
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Name *</label>
                <Input
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="My Awesome Project"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                <Textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="What does this project do?"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Language</label>
                <Select value={newProject.language} onValueChange={(v) => setNewProject({ ...newProject, language: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    {Object.keys(starterCode).map((lang) => (
                      <SelectItem key={lang} value={lang} className="text-white hover:bg-white/10">
                        {languageIcons[lang] || "📄"} {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newProject.isPublic}
                  onChange={(e) => setNewProject({ ...newProject, isPublic: e.target.checked })}
                  className="rounded border-white/20"
                />
                <span className="text-sm text-slate-300">Public project</span>
              </div>
              <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Bot className="h-4 w-4 text-cyan-300" /> AI coding agent
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Allow the project editor to show an AI collaboration workspace.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newProject.aiAgentEnabled}
                    onChange={(e) => setNewProject({ ...newProject, aiAgentEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-white/20"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <HardDrive className="h-4 w-4 text-emerald-300" /> Local files
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Let this project use the desktop terminal agent after the user pairs their computer.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newProject.localFilesEnabled}
                    onChange={(e) => setNewProject({ ...newProject, localFilesEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Collaboration</label>
                  <Select
                    value={newProject.collaborationMode}
                    onValueChange={(v: "solo" | "team" | "public") => setNewProject({ ...newProject, collaborationMode: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
              <Button
                onClick={handleCreate}
                disabled={createProject.isPending || !newProject.name.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
              >
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="pl-10 bg-white/5 border-white/10 text-white"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-[#13131f] border-white/5 h-40">
              <CardContent className="p-4 space-y-3">
                <div className="h-8 w-8 rounded-lg bg-white/5 animate-pulse" />
                <div className="h-4 w-32 bg-white/5 animate-pulse rounded" />
                <div className="h-3 w-full bg-white/5 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No projects found</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="bg-[#13131f] border-white/5 hover:border-cyan-500/20 transition-all cursor-pointer group"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-lg">
                    {languageIcons[project.language || "plaintext"] || "📄"}
                  </div>
                  <div className="flex items-center gap-1">
                    {project.isPublic ? (
                      <Globe className="w-3 h-3 text-slate-600" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{project.description || "No description"}</p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {project.aiAgentEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                      <Bot className="h-3 w-3" /> AI
                    </span>
                  )}
                  {project.localFilesEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                      <HardDrive className="h-3 w-3" /> Local
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400">
                    {project.collaborationMode === "solo" ? <UserRound className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                    {project.collaborationMode || "solo"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <Code2 className="w-3 h-3" /> {project.language || "plaintext"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" /> {project.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
