import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Play, Save, Share2, Star, Eye, Clock, Users } from "lucide-react";

const SUPPORTED_LANGUAGES = [
  { id: "javascript", name: "JavaScript", icon: "🟨" },
  { id: "typescript", name: "TypeScript", icon: "🔷" },
  { id: "python", name: "Python", icon: "🐍" },
  { id: "rust", name: "Rust", icon: "🦀" },
  { id: "go", name: "Go", icon: "🔵" },
  { id: "html", name: "HTML", icon: "🌐" },
  { id: "css", name: "CSS", icon: "🎨" },
];

export default function PlaygroundPage() {
  const [code, setCode] = useState(`// Welcome to Code Playground!
// Select a language and start coding

function hello() {
  console.log("Hello, World!");
}

hello();`);
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = () => {
    setIsRunning(true);
    setOutput([]);
    
    // Simulated output for demo
    setTimeout(() => {
      setOutput(["Hello, World!"]);
      setIsRunning(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Code Playground</h1>
            <p className="text-slate-400 mt-1">Interactive coding environment</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-slate-700">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" className="border-slate-700">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={runCode} disabled={isRunning}>
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? "Running..." : "Run"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.icon} {lang.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="border-slate-700">
                      <Eye className="w-3 h-3 mr-1" />
                      0
                    </Badge>
                    <Badge variant="outline" className="border-slate-700">
                      <Star className="w-3 h-3 mr-1" />
                      0
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-[500px] bg-[#0a0a0f] text-slate-200 p-4 font-mono text-sm resize-none focus:outline-none"
                  spellCheck={false}
                />
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Output</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#0a0a0f] p-4 rounded-lg font-mono text-sm min-h-[150px]">
                  {output.length > 0 ? (
                    output.map((line, i) => (
                      <div key={i} className="text-green-400">{line}</div>
                    ))
                  ) : (
                    <span className="text-slate-500">Run your code to see output...</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Playground Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-slate-400 text-sm">Title</label>
                  <Input placeholder="My Playground" className="mt-1 bg-slate-800 border-slate-700" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Visibility</label>
                  <div className="mt-1 flex gap-2">
                    <Button variant="outline" size="sm" className="border-slate-700">Private</Button>
                    <Button variant="outline" size="sm" className="border-slate-700">Public</Button>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Created</span>
                    <span className="text-white">Just now</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["Hello World", "API Fetch", "Canvas Demo", "Algorithm"].map((template) => (
                  <Button key={template} variant="ghost" className="w-full justify-start text-slate-300 hover:text-white">
                    <Code2 className="w-4 h-4 mr-2" />
                    {template}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}