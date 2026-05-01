import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, MonitorUp, Play, Plug, ShieldCheck, Terminal, Unplug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

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
  approvalRequired?: boolean;
  websiteConnected?: boolean;
  lastWebsiteSeenAt?: string | null;
  pairedAccount?: {
    id?: string;
    email?: string;
    name?: string;
  } | null;
  tokenRequired?: boolean;
  tokenLength?: number;
  identificationRequired?: boolean;
  allowedUserIdConfigured?: boolean;
  allowedUserEmailConfigured?: boolean;
};

type RunResult = {
  ok: boolean;
  code?: number;
  stdout?: string;
  stderr?: string;
  error?: string | null;
  commandId?: string;
  agentStatus?: AgentHealth;
  requester?: {
    id?: string;
    email?: string;
    name?: string;
  };
};

const DEFAULT_ENDPOINT = "http://127.0.0.1:48731";
const EXPECTED_LOCAL_AGENT_VERSION = "0.5.0";
const EXPECTED_DESKTOP_AGENT_VERSION = "0.3.0";
const WINDOWS_AGENT_DOWNLOAD = "/downloads/OCNE-Desktop-Agent-Setup.exe";
const WINDOWS_AGENT_SHA256 = "12FCB656B42CCE3DCB08075D4EC8A0C089657F1A98513A9B7EDB0321A5446C4B";

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
  const { user } = useAuth();
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem("ocne-agent-endpoint") || DEFAULT_ENDPOINT);
  const [token, setToken] = useState(() => localStorage.getItem("ocne-agent-token") || "");
  const [stayConnected, setStayConnected] = useState(() => localStorage.getItem("ocne-agent-stay-connected") === "true");
  const [command, setCommand] = useState("python --version");
  const [approval, setApproval] = useState("");
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [status, setStatus] = useState(
    stayConnected
      ? "Restoring saved local agent connection..."
      : "Start the local agent, paste the token, then connect.",
  );
  const [isRunning, setIsRunning] = useState(false);

  const normalizedEndpoint = useMemo(() => endpoint.trim().replace(/\/+$/, ""), [endpoint]);
  const tokenValue = token.trim();
  const tokenRequired = health?.tokenRequired !== false;
  const approvalRequired = health?.approvalRequired !== false;
  const needsWebsiteApproval = approvalRequired && health?.approvalMode !== "terminal";
  const expectedAgentVersion = health?.name === "OCNE Desktop Agent" ? EXPECTED_DESKTOP_AGENT_VERSION : EXPECTED_LOCAL_AGENT_VERSION;
  const versionIsCurrent = health?.version === expectedAgentVersion;
  const isDesktopAgent = health?.name === "OCNE Desktop Agent";
  const requester = useMemo(() => {
    const name =
      (typeof (user as any)?.fullName === "string" && (user as any).fullName) ||
      (typeof (user as any)?.full_name === "string" && (user as any).full_name) ||
      (typeof (user as any)?.name === "string" && (user as any).name) ||
      (typeof (user as any)?.username === "string" && (user as any).username) ||
      "";

    return {
      id: String((user as any)?.id || ""),
      email: String((user as any)?.email || ""),
      name,
    };
  }, [user]);

  useEffect(() => {
    localStorage.setItem("ocne-agent-endpoint", endpoint.trim());
  }, [endpoint]);

  useEffect(() => {
    localStorage.setItem("ocne-agent-token", token.trim());
  }, [token]);

  useEffect(() => {
    localStorage.setItem("ocne-agent-stay-connected", stayConnected ? "true" : "false");
  }, [stayConnected]);

  useEffect(() => {
    if (stayConnected) {
      void connect({ remember: true, quiet: true });
    }
    // Run once on mount so a saved connection can restore itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!health || !isDesktopAgent || !tokenValue) return;

    const interval = window.setInterval(() => {
      void pairDesktopAgent({ quiet: true });
    }, 30000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health?.name, normalizedEndpoint, tokenValue, requester.id, requester.email, requester.name]);

  async function pairDesktopAgent(options?: { quiet?: boolean }) {
    if (!tokenValue) {
      if (!options?.quiet) setStatus("Paste the desktop agent pairing token first.");
      return null;
    }

    try {
      const data = await readJsonResponse(await fetch(`${normalizedEndpoint}/pair`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ocne-agent-token": tokenValue,
          "x-ocne-user-id": requester.id,
          "x-ocne-user-email": requester.email,
          "x-ocne-user-name": requester.name,
        },
        body: JSON.stringify({ requester }),
      }));
      setHealth(data);
      return data;
    } catch (error) {
      if (!options?.quiet) setStatus(explainError(error));
      return null;
    }
  }

  async function connect(options?: { remember?: boolean; quiet?: boolean }) {
    setStatus("Connecting to local agent...");
    setResult(null);
    setHealth(null);
    try {
      const data = await readJsonResponse(await fetch(`${normalizedEndpoint}/health`, { cache: "no-store" }));
      let connectedData = data;
      setHealth(data);
      if (data.name === "OCNE Desktop Agent" && data.tokenRequired !== false) {
        const paired = await pairDesktopAgent({ quiet: true });
        if (paired) {
          connectedData = paired;
        }
      }
      if (options?.remember !== false) {
        setStayConnected(true);
      }
      setStatus(
        connectedData.version === (connectedData.name === "OCNE Desktop Agent" ? EXPECTED_DESKTOP_AGENT_VERSION : EXPECTED_LOCAL_AGENT_VERSION)
          ? connectedData.name === "OCNE Desktop Agent"
            ? connectedData.websiteConnected
              ? "Desktop Agent paired. OCNE Website heartbeat is connected."
              : "Desktop Agent reached. Paste the pairing token to complete the connection."
            : connectedData.approvalRequired === false
              ? "Connected. Direct mode is enabled, commands run without APPROVE."
            : "Connected. Type APPROVE in the website before running a command."
          : `Connected to agent ${connectedData.version}. Restart the agent to use ${connectedData.name === "OCNE Desktop Agent" ? EXPECTED_DESKTOP_AGENT_VERSION : EXPECTED_LOCAL_AGENT_VERSION}.`,
      );
    } catch (error) {
      setHealth(null);
      setStatus(options?.quiet ? "Saved agent is not reachable. Start it, then connect again." : explainError(error));
    }
  }

  function disconnect() {
    setHealth(null);
    setResult(null);
    setApproval("");
    setStayConnected(false);
    setStatus("Disconnected. Saved endpoint/token remain in the browser so you can connect again.");
  }

  async function runCommand() {
    if (tokenRequired && !tokenValue) {
      setStatus("Paste the local agent token first.");
      return;
    }
    if (needsWebsiteApproval && approval.trim().toUpperCase() !== "APPROVE") {
      setStatus("Type APPROVE in the website approval box before sending the command.");
      return;
    }

    setIsRunning(true);
    setStatus(
      !approvalRequired
        ? "Running command..."
        : needsWebsiteApproval
          ? "Running approved command..."
          : "Waiting for approval in the local agent window...",
    );
    setResult(null);
    try {
      const data = await readJsonResponse(await fetch(`${normalizedEndpoint}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ocne-user-id": requester.id,
          "x-ocne-user-email": requester.email,
          "x-ocne-user-name": requester.name,
          ...(tokenRequired ? { "x-ocne-agent-token": tokenValue } : {}),
        },
        body: JSON.stringify({ command, approval: approval.trim(), requester }),
      }));
      setResult(data);
      if (data.agentStatus) {
        setHealth(data.agentStatus);
      }
      setStatus(data.ok ? "Command finished." : data.error || "Command failed.");
      setApproval("");
    } catch (error) {
      const message = explainError(error);
      setResult({
        ok: false,
        code: 1,
        stdout: "",
        stderr: "",
        error: message,
      });
      setStatus(message);
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
            Pair OCNE with the desktop app running on this computer, then use the terminal with the computer permissions the user allows.
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
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <div className="text-sm font-semibold text-cyan-100">Install OCNE Desktop Agent</div>
              <p className="mt-2 text-xs leading-5 text-cyan-100/80">
                Download the Windows app and open the installer. Setup installs for all users, asks Windows for administrator permission, and still lets the user change the installation folder.
              </p>
              <a
                href={WINDOWS_AGENT_DOWNLOAD}
                download="OCNE-Desktop-Agent-Setup.exe"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Windows Agent
              </a>
              <div className="mt-3 text-[11px] text-cyan-100/70">
                The installer asks for administrator confirmation. Antivirus trust still requires code signing and reputation.
              </div>
              <div className="mt-2 break-all text-[11px] text-cyan-100/60">
                SHA256: {WINDOWS_AGENT_SHA256}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-300">
              Start OCNE Desktop Agent on the user's computer, then paste its internal browser bridge URL and pairing token here.
              <pre className="mt-3 overflow-auto rounded-xl bg-black p-3 text-xs text-cyan-100">npm run desktop-agent</pre>
              Developer fallback: <code>npm run agent:direct</code>
            </div>
            <Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} className="border-white/10 bg-black/30 text-white" />
            {tokenRequired && (
              <Input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste local agent token" className="border-white/10 bg-black/30 text-white" />
            )}
            <label className="flex items-start gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={stayConnected}
                onChange={(event) => setStayConnected(event.target.checked)}
                className="mt-0.5"
              />
              <span>Stay connected in this browser and auto-connect next time. Disconnect turns this off.</span>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={() => void connect({ remember: true })} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                <Plug className="mr-2 h-4 w-4" />
                {health ? "Reconnect" : "Connect to agent"}
              </Button>
              <Button onClick={disconnect} disabled={!health && !stayConnected} variant="ghost" className="w-full border border-white/10 text-slate-200 hover:bg-white/10">
                <Unplug className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">{status}</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
              <div className="mb-1 font-semibold text-slate-100">Website identity</div>
              <div>{requester.name || "Signed-in OCNE user"}</div>
              <div>{requester.email || "No email available"}</div>
              <div className="break-all">{requester.id || "No user id available"}</div>
            </div>
            {health && (
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                <div>Agent: {health.name}</div>
                {isDesktopAgent && (
                  <div className={health.websiteConnected ? "text-emerald-300" : "text-amber-200"}>
                    Website: {health.websiteConnected ? "paired and heartbeat connected" : "waiting for pairing token"}
                  </div>
                )}
                <div className={versionIsCurrent ? "text-emerald-300" : "text-amber-200"}>
                  Version: {health.version} {versionIsCurrent ? "(current)" : `(expected ${expectedAgentVersion})`}
                </div>
                <div>URL: {health.url || normalizedEndpoint}</div>
                <div>Port: {health.port || "unknown"}</div>
                <div>Computer: {health.hostname}</div>
                <div>Platform: {health.platform} / {health.arch}</div>
                <div>Approval: {health.approvalRequired === false ? "direct mode, no per-command approval" : health.approvalMode === "terminal" ? "Agent terminal window" : "Website APPROVE field"}</div>
                <div>Token: {health.tokenRequired === false ? "disabled for local testing" : `required${health.tokenLength ? `, ${health.tokenLength} characters` : ""}`}</div>
                {isDesktopAgent && health.pairedAccount && (
                  <div>Paired account: {health.pairedAccount.name || "OCNE user"} {health.pairedAccount.email ? `<${health.pairedAccount.email}>` : ""}</div>
                )}
                {isDesktopAgent && health.lastWebsiteSeenAt && (
                  <div>Last heartbeat: {new Date(health.lastWebsiteSeenAt).toLocaleString()}</div>
                )}
                <div>
                  Identity: {health.identificationRequired
                    ? `restricted${health.allowedUserEmailConfigured ? " by email" : ""}${health.allowedUserIdConfigured ? " by user id" : ""}`
                    : "logged only"}
                </div>
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
              {health?.approvalRequired === false
                ? "Direct mode is enabled. Commands run immediately after connection, using the local user's file permissions."
                : health?.approvalMode === "terminal"
                ? "The command will not run until the user types approval in the local agent window."
                : "The command sends your OCNE identity, then waits for APPROVE and a valid token when token mode is enabled. Approval resets after each run."}
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
