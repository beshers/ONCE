import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileCode2, Plus, Search, Heart, Copy, Trash2,
  Globe, Lock, Clock
} from "lucide-react";

const languages = ["javascript", "typescript", "python", "php", "java", "csharp", "go", "rust", "html", "css", "sql", "plaintext"];

const languageIcons: Record<string, string> = {
  javascript: "⚡", typescript: "📘", python: "🐍", php: "🐘",
  java: "☕", csharp: "💠", go: "🐹", rust: "🦀",
  html: "🌐", css: "🎨", sql: "🗄️", plaintext: "📄",
};

export default function SnippetsPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newSnippet, setNewSnippet] = useState({ title: "", language: "javascript", code: "", description: "", isPublic: true });
  const utils = trpc.useUtils();

  const { data: mySnippets } = trpc.snippet.list.useQuery();
  const { data: publicSnippets } = trpc.snippet.publicList.useQuery();
  const createSnippet = trpc.snippet.create.useMutation({
    onSuccess: () => {
      utils.snippet.list.invalidate();
      utils.snippet.publicList.invalidate();
      setCreateOpen(false);
      setNewSnippet({ title: "", language: "javascript", code: "", description: "", isPublic: true });
      toast.success("Snippet saved!");
    },
  });
  const deleteSnippet = trpc.snippet.delete.useMutation({
    onSuccess: () => utils.snippet.list.invalidate(),
  });

  const allSnippets = [...(mySnippets || []), ...(publicSnippets?.map((s) => s.snippet) || [])]
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

  const filtered = search
    ? allSnippets.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.language.toLowerCase().includes(search.toLowerCase())
      )
    : allSnippets;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Code Snippets</h1>
          <p className="text-slate-400 text-sm">Save and share reusable code</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Snippet
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#13131f] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-cyan-400" /> New Snippet
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                value={newSnippet.title}
                onChange={(e) => setNewSnippet({ ...newSnippet, title: e.target.value })}
                placeholder="Snippet title"
                className="bg-white/5 border-white/10 text-white"
              />
              <Select value={newSnippet.language} onValueChange={(v) => setNewSnippet({ ...newSnippet, language: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {languages.map((l) => (
                    <SelectItem key={l} value={l} className="text-white">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={newSnippet.code}
                onChange={(e) => setNewSnippet({ ...newSnippet, code: e.target.value })}
                placeholder="Paste your code here..."
                className="bg-white/5 border-white/10 text-white font-mono text-xs min-h-[120px]"
              />
              <Textarea
                value={newSnippet.description}
                onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
                placeholder="Description (optional)"
                className="bg-white/5 border-white/10 text-white text-xs"
              />
              <Button
                onClick={() => createSnippet.mutate(newSnippet)}
                disabled={!newSnippet.title.trim() || !newSnippet.code.trim()}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Save Snippet
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
          placeholder="Search snippets..."
          className="pl-10 bg-white/5 border-white/10 text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((snippet) => (
          <Card key={snippet.id} className="bg-[#13131f] border-white/5 hover:border-cyan-500/20 transition-all overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{languageIcons[snippet.language] || "📄"}</span>
                  <CardTitle className="text-sm font-semibold text-white">{snippet.title}</CardTitle>
                </div>
                <Badge variant="outline" className="border-white/10 text-slate-500 text-[10px] h-4">
                  {snippet.isPublic ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                  {snippet.language}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-[#0d0d12] rounded-lg p-3 overflow-x-auto">
                <pre className="text-[11px] text-slate-400 font-mono whitespace-pre-wrap">
                  <code>{(snippet.code || "").slice(0, 300)}{(snippet.code || "").length > 300 ? "..." : ""}</code>
                </pre>
              </div>
              <p className="text-xs text-slate-500">{snippet.description || "No description"}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-slate-600">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {snippet.likes}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(snippet.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:text-cyan-400" onClick={() => { navigator.clipboard.writeText(snippet.code || ""); toast.success("Copied!"); }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:text-red-400" onClick={() => deleteSnippet.mutate({ id: snippet.id })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
