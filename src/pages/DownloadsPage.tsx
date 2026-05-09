import { Link } from "react-router";
import {
  CheckCircle2,
  Code2,
  Download,
  ExternalLink,
  FileText,
  HardDriveDownload,
  MonitorUp,
  ShieldCheck,
  Terminal,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DOWNLOAD_BASE_URL = (import.meta.env.VITE_DOWNLOAD_BASE_URL || "/downloads").replace(/\/$/, "");
const downloadUrl = (fileName: string) => `${DOWNLOAD_BASE_URL}/${fileName}`;

const WINDOWS_AGENT_DOWNLOAD = downloadUrl("OCNE-Desktop-Agent-Setup.exe");
const WINDOWS_PROGRAM_DOWNLOAD = downloadUrl("OCNE-Windows-Program-Setup.exe");
const WINDOWS_APP_DOWNLOAD = downloadUrl("OCNE-Desktop-App-Windows.zip");
const WINDOWS_APP_LITE_DOWNLOAD = downloadUrl("OCNE-Desktop-App-Windows-Lite.zip");
const MAC_APP_ARM64_DOWNLOAD = downloadUrl("OCNE-Desktop-App-macOS-Apple-Silicon.zip");
const MAC_APP_X64_DOWNLOAD = downloadUrl("OCNE-Desktop-App-macOS-Intel.zip");
const WINDOWS_AGENT_SHA256 =
  "E996B55D4B8E0FC1438E6632ECF22EB6563A0109688F43B76A12080AB9EF7E99";
const WINDOWS_PROGRAM_SHA256 =
  "270AEFB742FF0A7E7400CF013B5AA70AF3ABF9F71CE8F9F5AF76412B54598F9E";
const WINDOWS_APP_SHA256 =
  "163B8DE55B048A7279B32CAA6183F70F10BFD1073160BED7BA956C58006B0383";
const WINDOWS_APP_LITE_SHA256 =
  "FFC4F8A0EA02842B13B673B6EB2D7C035A7D8297C3C21A876E85CA0F3B777239";
const MAC_APP_ARM64_SHA256 =
  "702EEFC210984C92F4D02B6F4F71E348B62EC272B76B89C5EC0641CFC7E1D98C";
const MAC_APP_X64_SHA256 =
  "F2F1C5DAC2A61C68E3ECBE9E688181B435C2A5511E6C773B43949B88D4CD9CA6";

const downloads = [
  {
    title: "OCNE Windows Program",
    description: "Installable OCNE app that bundles the same interface as the website and connects to the online OCNE API/database. Build this with VITE_API_URL before publishing.",
    href: WINDOWS_PROGRAM_DOWNLOAD,
    fileType: "EXE",
    meta: "Windows program, online database",
    badge: "Native shell",
    icon: HardDriveDownload,
    checksum: WINDOWS_PROGRAM_SHA256,
  },
  {
    title: "OCNE Desktop App for Windows Lite",
    description: "Smaller Windows desktop app. Best choice if antivirus blocks the standalone ZIP. Requires Microsoft .NET 8 Desktop Runtime.",
    href: WINDOWS_APP_LITE_DOWNLOAD,
    fileType: "ZIP",
    meta: "Windows app, .NET required",
    badge: "Safer choice",
    icon: HardDriveDownload,
    checksum: WINDOWS_APP_LITE_SHA256,
  },
  {
    title: "OCNE Desktop App for Windows Standalone",
    description: "Self-contained Avalonia/C# desktop app that opens OCNE without installing .NET. Extract the ZIP first, then run Start-OCNE-Desktop-Windows.cmd.",
    href: WINDOWS_APP_DOWNLOAD,
    fileType: "ZIP",
    meta: "Windows app, no .NET install",
    badge: "Standalone",
    icon: HardDriveDownload,
    checksum: WINDOWS_APP_SHA256,
  },
  {
    title: "OCNE Desktop App for Apple Silicon",
    description: "macOS build for M1, M2, M3, and newer Apple Silicon Macs. Requires the .NET 10 runtime.",
    href: MAC_APP_ARM64_DOWNLOAD,
    fileType: "ZIP",
    meta: "macOS arm64",
    badge: "Apple",
    icon: HardDriveDownload,
    checksum: MAC_APP_ARM64_SHA256,
  },
  {
    title: "OCNE Desktop App for Intel Mac",
    description: "macOS build for older Intel Macs. Requires the .NET 10 runtime.",
    href: MAC_APP_X64_DOWNLOAD,
    fileType: "ZIP",
    meta: "macOS x64",
    badge: "Apple",
    icon: HardDriveDownload,
    checksum: MAC_APP_X64_SHA256,
  },
  {
    title: "OCNE Desktop Agent for Windows",
    description: "Required for local terminal access, workspace automation, and desktop-assisted coding features.",
    href: WINDOWS_AGENT_DOWNLOAD,
    fileType: "EXE",
    meta: "Windows installer",
    badge: "Recommended",
    icon: MonitorUp,
    checksum: WINDOWS_AGENT_SHA256,
  },
  {
    title: "Quick Start Guide",
    description: "A short setup checklist for signing in, opening chat, running terminal sessions, and installing the agent.",
    href: downloadUrl("OCNE-quick-start.txt"),
    fileType: "TXT",
    meta: "Setup notes",
    badge: "Guide",
    icon: FileText,
  },
  {
    title: "Local Agent Checklist",
    description: "Use this when terminal, desktop agent, or localhost features need to be enabled on a new machine.",
    href: downloadUrl("OCNE-local-agent-checklist.txt"),
    fileType: "TXT",
    meta: "Agent setup",
    badge: "Checklist",
    icon: Terminal,
  },
  {
    title: "Troubleshooting Notes",
    description: "Common fixes for browser permissions, blocked downloads, stale sessions, and connection issues.",
    href: downloadUrl("OCNE-troubleshooting.txt"),
    fileType: "TXT",
    meta: "Help file",
    badge: "Support",
    icon: Wrench,
  },
];

const relatedTools = [
  { label: "Open terminal", path: "/terminal", icon: Terminal },
  { label: "Open chat", path: "/chat", icon: Code2 },
  { label: "Local agent", path: "/local-agent", icon: MonitorUp },
  { label: "Documentation", path: "/documentation", icon: FileText },
];

export default function DownloadsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111b21] shadow-xl shadow-black/20">
        <div className="border-b border-white/10 bg-[#202c33] px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#7ee5c3]">
                <HardDriveDownload className="h-4 w-4" />
                Downloads
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-white">Files needed to use OCNE</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Install the desktop agent for local terminal features, then keep the setup and troubleshooting files nearby for new devices.
                For Windows desktop app ZIPs, extract the whole folder first and run Start-OCNE-Desktop-Windows.cmd. If antivirus blocks the standalone app, use the Windows Lite ZIP and install the Microsoft .NET 8 Desktop Runtime first.
              </p>
            </div>
            <Badge className="border-0 bg-[#00a884]/15 px-3 py-1.5 text-[#7ee5c3]">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Verified resources
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {downloads.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.href} className="rounded-2xl border-[#26343b] bg-[#0b141a] p-4 shadow-none">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00a884]/15 text-[#7ee5c3]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-white">{item.title}</h2>
                      <Badge variant="outline" className="border-[#00a884]/30 text-[#7ee5c3]">
                        {item.badge}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-white/10 text-slate-300">{item.fileType}</Badge>
                      <Badge variant="outline" className="border-white/10 text-slate-300">{item.meta}</Badge>
                    </div>
                    {item.checksum && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-[#111b21] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">SHA-256</div>
                        <div className="mt-1 break-all font-mono text-[11px] text-slate-300">{item.checksum}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild className="rounded-full bg-[#00a884] text-[#07130f] hover:bg-[#06cf9c]">
                    <a href={item.href} download>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                  <Button asChild variant="ghost" className="rounded-full border border-[#26343b] text-slate-200 hover:bg-[#111b21]">
                    <a href={item.href} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open
                    </a>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-2xl border-white/10 bg-[#111b21] p-4 shadow-lg shadow-black/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <CheckCircle2 className="h-4 w-4 text-[#00a884]" />
            Recommended setup order
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["Download the desktop agent", "Open Terminal and connect", "Use Chat and files"].map((step, index) => (
              <div key={step} className="rounded-xl border border-[#26343b] bg-[#0b141a] p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Step {index + 1}</div>
                <div className="mt-2 text-sm font-medium text-slate-100">{step}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-[#111b21] p-4 shadow-lg shadow-black/20">
          <div className="text-sm font-semibold text-white">Related tools</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {relatedTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.path}
                  asChild
                  variant="ghost"
                  className="justify-start rounded-full border border-[#26343b] text-slate-200 hover:bg-[#202c33]"
                >
                  <Link to={tool.path}>
                    <Icon className="mr-2 h-4 w-4" />
                    {tool.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
