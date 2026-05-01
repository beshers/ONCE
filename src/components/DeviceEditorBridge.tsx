import { useMemo, useState } from "react";
import { Download, HardDrive, Plug, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

type AgentHealth = {
  ok: boolean;
  name: string;
  version: string;
  hostname: string;
  workspace: string;
  tokenRequired?: boolean;
  approvalRequired?: boolean;
  approvalMode?: string;
};

type DeviceEditorBridgeProps = {
  fileName?: string;
  content: string;
  onImport: (content: string) => void;
  disabled?: boolean;
};

const DEFAULT_ENDPOINT = "http://127.0.0.1:48731";

async function readJson(response: Response) {
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

function escapePowerShellString(value: string) {
  return value.replace(/'/g, "''");
}

function toBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64Utf8(value: string) {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function DeviceEditorBridge({
  fileName = "main.txt",
  content,
  onImport,
  disabled = false,
}: DeviceEditorBridgeProps) {
  const { user } = useAuth({ requireAuth: false });
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem("ocne-agent-endpoint") || DEFAULT_ENDPOINT);
  const [token, setToken] = useState(() => localStorage.getItem("ocne-agent-token") || "");
  const [localPath, setLocalPath] = useState(() => `.\\ocne-live\\${fileName}`);
  const [approval, setApproval] = useState("");
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [status, setStatus] = useState("Connect the user's device to sync this live file.");
  const [isBusy, setIsBusy] = useState(false);

  const normalizedEndpoint = endpoint.trim().replace(/\/+$/, "");
  const tokenValue = token.trim();
  const needsApproval = health?.approvalRequired !== false && health?.approvalMode !== "terminal";
  const requester = useMemo(() => ({
    id: String((user as any)?.id || ""),
    email: String((user as any)?.email || ""),
    name: String((user as any)?.name || (user as any)?.username || ""),
  }), [user]);

  async function connect() {
    setIsBusy(true);
    setStatus("Connecting to device agent...");
    try {
      localStorage.setItem("ocne-agent-endpoint", endpoint.trim());
      localStorage.setItem("ocne-agent-token", token.trim());
      const data = await readJson(await fetch(`${normalizedEndpoint}/health`, { cache: "no-store" }));
      setHealth(data);
      setStatus(`Connected to ${data.hostname || "device"} through ${data.name || "OCNE Agent"}.`);
      return data as AgentHealth;
    } catch (error) {
      setHealth(null);
      setStatus(error instanceof Error ? error.message : "Could not connect to device agent.");
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  async function runDeviceCommand(command: string) {
    const currentHealth = health || await connect();
    if (!currentHealth) {
      throw new Error("Connect to the device agent first.");
    }
    if (currentHealth.tokenRequired !== false && !tokenValue) {
      throw new Error("Paste the local agent token first.");
    }
    const commandNeedsApproval = currentHealth.approvalRequired !== false && currentHealth.approvalMode !== "terminal";
    if (commandNeedsApproval && approval.trim().toUpperCase() !== "APPROVE") {
      throw new Error("Type APPROVE before syncing with this device.");
    }

    const data = await readJson(await fetch(`${normalizedEndpoint}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ocne-user-id": requester.id,
        "x-ocne-user-email": requester.email,
        "x-ocne-user-name": requester.name,
        ...(tokenValue ? { "x-ocne-agent-token": tokenValue } : {}),
      },
      body: JSON.stringify({ command, approval: approval.trim(), requester }),
    }));

    if (!data.ok) {
      throw new Error(data.stderr || data.error || "Device command failed.");
    }
    setApproval("");
    return String(data.stdout || "");
  }

  async function pullFromDevice() {
    setIsBusy(true);
    setStatus("Reading local file from device...");
    try {
      const path = escapePowerShellString(localPath.trim());
      const command = `$path='${path}'; if (!(Test-Path -LiteralPath $path)) { throw "File not found: $path" }; [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)))`;
      const output = await runDeviceCommand(command);
      onImport(fromBase64Utf8(output));
      setStatus(`Pulled ${localPath} into the live editor.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not pull file from device.");
    } finally {
      setIsBusy(false);
    }
  }

  async function pushToDevice() {
    setIsBusy(true);
    setStatus("Writing live editor content to device...");
    try {
      const path = escapePowerShellString(localPath.trim());
      const encoded = toBase64Utf8(content);
      const command = `$path='${path}'; $dir=Split-Path -Parent $path; if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }; $content=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')); [IO.File]::WriteAllText($path, $content, [Text.UTF8Encoding]::new($false)); Write-Output "Wrote $path"`;
      await runDeviceCommand(command);
      setStatus(`Pushed live editor content to ${localPath}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not push file to device.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <HardDrive className="h-4 w-4 text-emerald-300" /> Device bridge
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Sync the active live-coding file with a path on the user's paired computer.
          </p>
        </div>
        <Badge className={health ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-200"}>
          {health ? health.hostname : "Not connected"}
        </Badge>
      </div>

      <div className="grid gap-3">
        <Input
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          className="border-white/10 bg-white/[0.03] text-white"
          placeholder="Agent URL"
        />
        <Input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="border-white/10 bg-white/[0.03] text-white"
          placeholder="Pairing token if required"
        />
        <Input
          value={localPath}
          onChange={(event) => setLocalPath(event.target.value)}
          className="border-white/10 bg-white/[0.03] font-mono text-white"
          placeholder=".\\ocne-live\\main.ts"
        />
        {needsApproval && (
          <Input
            value={approval}
            onChange={(event) => setApproval(event.target.value)}
            className="border-amber-500/20 bg-amber-500/10 text-white"
            placeholder="Type APPROVE before pull/push"
          />
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={() => void connect()} disabled={isBusy} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
            <Plug className="mr-2 h-4 w-4" /> Connect
          </Button>
          <Button onClick={() => void pullFromDevice()} disabled={disabled || isBusy || !localPath.trim()} variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10">
            <Download className="mr-2 h-4 w-4" /> Pull
          </Button>
          <Button onClick={() => void pushToDevice()} disabled={disabled || isBusy || !localPath.trim()} variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10">
            <Upload className="mr-2 h-4 w-4" /> Push
          </Button>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-300">{status}</div>
      </div>
    </div>
  );
}
