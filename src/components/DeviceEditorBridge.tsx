import { useMemo, useState } from "react";
import { Download, FolderDown, FolderUp, HardDrive, Play, Plug, Upload } from "lucide-react";
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
  projectName?: string;
  fileName?: string;
  content: string;
  projectFiles?: BridgeFile[];
  onImport: (content: string) => void;
  onImportProject?: (items: ImportedProjectItem[]) => Promise<void> | void;
  disabled?: boolean;
};

export type BridgeFile = {
  id: number;
  parentId?: number | null;
  name: string;
  type: "file" | "folder";
  content?: string | null;
  language?: string | null;
};

export type ImportedProjectItem = {
  path: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  language?: string;
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
  projectName = "ocne-project",
  fileName = "main.txt",
  content,
  projectFiles = [],
  onImport,
  onImportProject,
  disabled = false,
}: DeviceEditorBridgeProps) {
  const { user } = useAuth({ requireAuth: false });
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem("ocne-agent-endpoint") || DEFAULT_ENDPOINT);
  const [token, setToken] = useState(() => localStorage.getItem("ocne-agent-token") || "");
  const [localPath, setLocalPath] = useState(() => `.\\ocne-live\\${fileName}`);
  const [localProjectPath, setLocalProjectPath] = useState(() => `.\\ocne-live\\${projectName.replace(/[^a-z0-9._-]+/gi, "-")}`);
  const [deviceCommand, setDeviceCommand] = useState("npm install");
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

  function projectPathFor(item: BridgeFile) {
    const byId = new Map(projectFiles.map((file) => [file.id, file]));
    const parts = [item.name];
    let parentId = item.parentId ?? null;
    const seen = new Set<number>();

    while (parentId) {
      if (seen.has(parentId)) break;
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      parentId = parent.parentId ?? null;
    }

    return parts.join("\\");
  }

  async function saveProjectToDevice() {
    setIsBusy(true);
    setStatus("Saving the full OCNE project to the device...");
    try {
      const root = escapePowerShellString(localProjectPath.trim());
      const manifest = projectFiles.map((file) => ({
        path: projectPathFor(file),
        type: file.type,
        content: file.type === "file" ? file.content || "" : "",
      }));
      const encoded = toBase64Utf8(JSON.stringify(manifest));
      const command = `$root='${root}'; New-Item -ItemType Directory -Force -Path $root | Out-Null; $json=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')); $items=$json | ConvertFrom-Json; foreach ($item in $items) { $target=Join-Path $root $item.path; if ($item.type -eq 'folder') { New-Item -ItemType Directory -Force -Path $target | Out-Null } else { $dir=Split-Path -Parent $target; if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }; [IO.File]::WriteAllText($target, [string]$item.content, [Text.UTF8Encoding]::new($false)) } }; Write-Output "Saved project to $root"`;
      await runDeviceCommand(command);
      setStatus(`Saved ${manifest.length} project items to ${localProjectPath}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save project to device.");
    } finally {
      setIsBusy(false);
    }
  }

  async function importProjectFromDevice() {
    if (!onImportProject) return;
    setIsBusy(true);
    setStatus("Reading project folder from device...");
    try {
      const root = escapePowerShellString(localProjectPath.trim());
      const command = `$root='${root}'; if (!(Test-Path -LiteralPath $root)) { throw "Folder not found: $root" }; $rootItem=Get-Item -LiteralPath $root; $items=@(); Get-ChildItem -LiteralPath $root -Recurse -Force | Where-Object { $_.FullName -notmatch '\\\\.git(\\\\|$)' -and $_.FullName -notmatch '\\\\node_modules(\\\\|$)' -and $_.FullName -notmatch '\\\\dist(\\\\|$)' } | Select-Object -First 120 | ForEach-Object { $rel=$_.FullName.Substring($rootItem.FullName.Length).TrimStart('\\'); if ($_.PSIsContainer) { $items += [pscustomobject]@{ path=$rel; name=$_.Name; type='folder'; content=''; language='plaintext' } } elseif ($_.Length -le 262144) { $content=[IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8); $items += [pscustomobject]@{ path=$rel; name=$_.Name; type='file'; content=$content; language='plaintext' } } }; [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($items | ConvertTo-Json -Depth 4 -Compress)))`;
      const output = await runDeviceCommand(command);
      const items = JSON.parse(fromBase64Utf8(output)) as ImportedProjectItem[] | ImportedProjectItem;
      const normalized = Array.isArray(items) ? items : [items];
      await onImportProject(normalized);
      setStatus(`Imported ${normalized.length} items from ${localProjectPath} into OCNE.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import project from device.");
    } finally {
      setIsBusy(false);
    }
  }

  async function runInProjectFolder() {
    setIsBusy(true);
    setStatus("Running command in the local project folder...");
    try {
      const root = escapePowerShellString(localProjectPath.trim());
      const command = `$root='${root}'; if (!(Test-Path -LiteralPath $root)) { New-Item -ItemType Directory -Force -Path $root | Out-Null }; Set-Location -LiteralPath $root; ${deviceCommand}`;
      const output = await runDeviceCommand(command);
      setStatus(output.trim() || `Command finished in ${localProjectPath}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not run command on device.");
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
            Sync the live editor and full project folder with the user's paired computer.
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
        <Input
          value={localProjectPath}
          onChange={(event) => setLocalProjectPath(event.target.value)}
          className="border-white/10 bg-white/[0.03] font-mono text-white"
          placeholder=".\\ocne-live\\my-project"
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
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={() => void saveProjectToDevice()} disabled={isBusy || projectFiles.length === 0} variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10">
            <FolderDown className="mr-2 h-4 w-4" /> Save project to device
          </Button>
          <Button onClick={() => void importProjectFromDevice()} disabled={isBusy || !onImportProject || !localProjectPath.trim()} variant="ghost" className="border border-white/10 text-slate-100 hover:bg-white/10">
            <FolderUp className="mr-2 h-4 w-4" /> Upload folder online
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={deviceCommand}
            onChange={(event) => setDeviceCommand(event.target.value)}
            className="border-white/10 bg-white/[0.03] font-mono text-white"
            placeholder="npm run dev"
          />
          <Button onClick={() => void runInProjectFolder()} disabled={isBusy || !deviceCommand.trim()} className="bg-white text-slate-950 hover:bg-slate-200">
            <Play className="mr-2 h-4 w-4" /> Run on device
          </Button>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-300">{status}</div>
      </div>
    </div>
  );
}
