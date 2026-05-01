import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, MonitorUp, Play, Plug, ShieldCheck, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type AgentHealth = {
  ok: boolean;
  name: string;
  version: string;
  port?: number;
  url?: string;
  platform: string;
  arch: string;
  hostname: string;
  workspace: string;
  approvalMode?: string;
  tokenLength?: number;
};

type RunResult = {
  ok: boolean;
  code?: number;
  stdout?: string;
  stderr?: string;
  error?: string | null;
};

const DEFAULT_ENDPOINT = "http://127.0.0.1:48731";
const EXPECTED_AGENT_VERSION = "0.3.0";

async function readJsonResponse(response: Response) {
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    (error as Error & { status?: number; code?: string }).status = response.status;
    (error as Error & { status?: number; code?: string }).code = data.code;
    throw error;
  }

  return data;
}

function explainError(error: unknown) {
  if (error instanceof TypeError) {
    return "Connection refused. Is the OCNE Local Agent running on this endpoint?";
  }

  if (error instanceof Error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 401) return "Invalid token. Copy the exact token printed by the current agent window.";
    if (status === 403) return "Approval required. Type APPROVE before running the command.";
    return error.message;
  }

  return "Unknown Local Agent error.";
}

export default function LocalAgentPage() {
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem("ocne-agent-endpoint") || DEFAULT_ENDPOINT);
  const [token, setToken] = useState(() => localStorage.getItem("ocne-agent-token") || "");
  const [command, setCommand] = useState("python --version");
  const [approval, setApproval] = useState("");
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [status, setStatus] = useState("Start the local agent, paste the token, then connect.");
  const [isRunning, setIsRunning] = useState(false);

  const normalizedEndpoint = useMemo(() => endpoint.trim().replace(/\/+$/, ""), [endpoint]);
  const tokenValue = token.trim();
  const needsWebsiteApproval = health?.approvalMode !== "terminal";
  const versionIsCurrent = health?.version === EXPECTED_AGENT_VERSION;

  useEffect(() => {
    localStorage.setItem("ocne-agent-endpoint", endpoint.trim());
  }, [endpoint]);

  useEffect(() => {
    localStorage.setItem("ocne-agent-token", token.trim());
  }, [token]);

  async function connect() {
    setStatus("Connecting to local agent...");
    setResult(null);
    setHealth(null);
    try {
      const data = await readJsonResponse(await fetch(`${normalizedEndpoint}/health`, { cache: "no-store" }));
      setHealth(data);
      setStatus(
        data.version === EXPECTED_AGENT_VERSION
          ? "Connected. Type APPROVE in the website before running a command."
          : `Connected to agent ${data.version}. Restart the agent to use ${EXPECTED_AGENT_VERSION}.`,
      );
    } catch (error) {
      setHealth(null);
      setStatus(explainError(error));
    }
  }

  async function runCommand() {
    if (!tokenValue) {
      setStatus("Paste the local agent token first.");
      return;
    }
    if (needsWebsiteApproval && approval.trim().toUpperCase() !== "APPROVE") {
      setStatus("Type APPROVE in the website approval box before sending the command.");
      return;
    }

    setIsRunning(true);
    setStatus(needsWebsiteApproval ? "Running approved command..." : "Waiting for approval in the local agent window...");
    setResult(null);
    try {
      const data = await readJsonResponse(await fetch(`${normalizedEndpoint}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ocne-agent-token": tokenValue,
        },
        body: JSON.stringify({ command, approval: approval.trim() }),
      }));
      setResult(data);
      setStatus(data.ok ? "Command finished." : data.error || "Command failed.");
      setApproval("");
    } catch (error) {
      setStatus(explainError(error));
    } finally {
      setIsRunning(false);
    }
  }

  const quickCommands = [
    "python --version",
    "git --version",
    "node --version",
    "npm --version",
    "python -m pip install --user rich",
    "dir",
    "Get-ChildItem",
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
            Connect to the local agent running on this computer. Commands require a valid token and explicit approval before they run.
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
              Copy the current endpoint and token from that agent window.
            </div>
            <Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} className="border-white/10 bg-black/30 text-white" />
            <Input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste local agent token" className="border-white/10 bg-black/30 text-white" />
            <Button onClick={() => void connect()} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Plug className="mr-2 h-4 w-4" />
              Connect to agent
            </Button>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">{status}</div>
            {health && (
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                <div>Agent: {health.name}</div>
                <div className={versionIsCurrent ? "text-emerald-300" : "text-amber-200"}>
                  Version: {health.version} {versionIsCurrent ? "(current)" : `(expected ${EXPECTED_AGENT_VERSION})`}
                </div>
                <div>URL: {health.url || normalizedEndpoint}</div>
                <div>Port: {health.port || "unknown"}</div>
                <div>Computer: {health.hostname}</div>
                <div>Platform: {health.platform} / {health.arch}</div>
                <div>Approval: {health.approvalMode === "terminal" ? "Agent terminal window" : "Website APPROVE field"}</div>
                <div>Token: required{health.tokenLength ? `, ${health.tokenLength} characters` : ""}</div>
                <div className="break-all">Workspace: {health.workspace}</div>
              </div>
            )}
            {health && !versionIsCurrent && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                This looks like an old agent. Close old agent windows and run <code>npm run agent</code> again.
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
                  {item.length > 34 ? `${item.slice(0, 34)}...` : item}
                </Button>
              ))}
            </div>
            <Textarea value={command} onChange={(event) => setCommand(event.target.value)} className="min-h-28 border-white/10 bg-black/30 font-mono text-white" />
            {needsWebsiteApproval && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Website approval</div>
                <Input
                  value={approval}
                  onChange={(event) => setApproval(event.target.value)}
                  placeholder="Type APPROVE to allow this command"
                  className="border-amber-500/20 bg-black/30 text-white placeholder:text-amber-100/50"
                />
              </div>
            )}
            <Button
              onClick={() => void runCommand()}
              disabled={isRunning || !health || !command.trim() || (needsWebsiteApproval && approval.trim().toUpperCase() !== "APPROVE")}
              className="w-full bg-white text-black hover:bg-slate-200"
            >
              <Play className="mr-2 h-4 w-4" />
              {isRunning ? "Running..." : "Run approved command"}
            </Button>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
              <ShieldCheck className="mr-2 inline h-4 w-4" />
              {health?.approvalMode === "terminal"
                ? "The command will not run until the user types approval in the local agent window."
                : "The command will not run until APPROVE is typed in this website and the token is valid. Approval resets after each run."}
            </div>
            {result && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div className="border-b border-white/10 px-3 py-2 text-xs text-slate-400">
                  Exit code {result.code ?? 0} - {result.ok ? "success" : "failed"}
                </div>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-3 text-xs text-slate-100">
                  {[result.stdout, result.stderr, result.error].filter(Boolean).join("\n") || "(no output)"}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
