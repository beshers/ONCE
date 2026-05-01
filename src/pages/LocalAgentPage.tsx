import { useEffect, useMemo, useState } from "react";
import { MonitorUp, Play, Plug, ShieldCheck, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type AgentHealth = {
  ok: boolean;
  name: string;
  version: string;
  platform: string;
  arch: string;
  hostname: string;
  workspace: string;
};

type RunResult = {
  ok: boolean;
  code?: number;
  stdout?: string;
  stderr?: string;
  error?: string | null;
};

const DEFAULT_ENDPOINT = "http://127.0.0.1:48731";

export default function LocalAgentPage() {
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem("ocne-agent-endpoint") || DEFAULT_ENDPOINT);
  const [token, setToken] = useState(() => localStorage.getItem("ocne-agent-token") || "");
  const [command, setCommand] = useState("python --version");
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [status, setStatus] = useState("Start the local agent, paste the token, then connect.");
  const [isRunning, setIsRunning] = useState(false);

  const normalizedEndpoint = useMemo(() => endpoint.replace(/\/+$/, ""), [endpoint]);

  useEffect(() => {
    localStorage.setItem("ocne-agent-endpoint", endpoint);
  }, [endpoint]);

  useEffect(() => {
    localStorage.setItem("ocne-agent-token", token);
  }, [token]);

  async function connect() {
    setStatus("Connecting to local agent...");
    setResult(null);
    try {
      const response = await fetch(`${normalizedEndpoint}/health`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Agent did not respond correctly.");
      }
      setHealth(data);
      setStatus("Connected. Commands still require approval in the local agent window.");
    } catch (error) {
      setHealth(null);
      setStatus(error instanceof Error ? error.message : "Could not connect to local agent.");
    }
  }

  async function runCommand() {
    if (!token.trim()) {
      setStatus("Paste the local agent token first.");
      return;
    }

    setIsRunning(true);
    setStatus("Waiting for approval on the local computer...");
    setResult(null);
    try {
      const response = await fetch(`${normalizedEndpoint}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ocne-agent-token": token.trim(),
        },
        body: JSON.stringify({ command }),
      });
      const data = await response.json();
      setResult(data);
      setStatus(data.ok ? "Command finished." : data.error || "Command failed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Command request failed.");
    } finally {
      setIsRunning(false);
    }
  }

  const quickCommands = [
    "python --version",
    "python -c \"print('OCNE local agent works')\"",
    "node --version",
    "npm --version",
    "dir",
    "Get-ChildItem",
    "winget install -e --id Python.Python.3.12",
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-cyan-300">
            <MonitorUp className="h-4 w-4" />
            Local Computer Control
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-white">OCNE Local Agent</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Run approved commands on your own computer through a local agent. The website sends the request, but the agent asks you before anything runs.
          </p>
        </div>
        <Badge className={health ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"}>
          {health ? "Connected" : "Not connected"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-white/10 bg-[#0f0f1a] text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4 text-cyan-300" />
              Connect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-300">
              Start the local agent on the user's computer:
              <pre className="mt-3 overflow-auto rounded-xl bg-black p-3 text-xs text-cyan-100">npm run agent</pre>
              Copy the printed token into this page.
            </div>
            <Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} className="border-white/10 bg-black/30 text-white" />
            <Input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste local agent token" className="border-white/10 bg-black/30 text-white" />
            <Button onClick={() => void connect()} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Plug className="mr-2 h-4 w-4" />
              Connect to agent
            </Button>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">{status}</div>
            {health && (
              <div className="grid gap-2 text-xs text-slate-300">
                <div>Computer: {health.hostname}</div>
                <div>Platform: {health.platform} / {health.arch}</div>
                <div className="break-all">Workspace: {health.workspace}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0f0f1a] text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="h-4 w-4 text-cyan-300" />
              Run Approved Command
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {quickCommands.map((item) => (
                <Button key={item} size="sm" variant="ghost" className="rounded-full border border-white/10 text-slate-200" onClick={() => setCommand(item)}>
                  {item.length > 30 ? `${item.slice(0, 30)}...` : item}
                </Button>
              ))}
            </div>
            <Textarea value={command} onChange={(event) => setCommand(event.target.value)} className="min-h-28 border-white/10 bg-black/30 font-mono text-white" />
            <Button onClick={() => void runCommand()} disabled={isRunning || !health || !command.trim()} className="w-full bg-white text-black hover:bg-slate-200">
              <Play className="mr-2 h-4 w-4" />
              {isRunning ? "Waiting for approval..." : "Send command request"}
            </Button>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
              <ShieldCheck className="mr-2 inline h-4 w-4" />
              The command will not run until the user types approval in the local agent window.
            </div>
            {result && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div className="border-b border-white/10 px-3 py-2 text-xs text-slate-400">
                  Exit code {result.code ?? 0} - {result.ok ? "success" : "failed"}
                </div>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-3 text-xs text-slate-100">
                  {[result.stdout, result.stderr, result.error].filter(Boolean).join("\n")}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
