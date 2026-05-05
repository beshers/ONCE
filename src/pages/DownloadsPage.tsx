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

const WINDOWS_AGENT_DOWNLOAD = "/downloads/OCNE-Desktop-Agent-Setup.exe";
const WINDOWS_AGENT_SHA256 =
  "E996B55D4B8E0FC1438E6632ECF22EB6563A0109688F43B76A12080AB9EF7E99";

const downloads = [
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
    href: "/downloads/OCNE-quick-start.txt",
    fileType: "TXT",
    meta: "Setup notes",
    badge: "Guide",
    icon: FileText,
  },
  {
    title: "Local Agent Checklist",
    description: "Use this when terminal, desktop agent, or localhost features need to be enabled on a new machine.",
    href: "/downloads/OCNE-local-agent-checklist.txt",
    fileType: "TXT",
    meta: "Agent setup",
    badge: "Checklist",
    icon: Terminal,
  },
  {
    title: "Troubleshooting Notes",
    description: "Common fixes for browser permissions, blocked downloads, stale sessions, and connection issues.",
    href: "/downloads/OCNE-troubleshooting.txt",
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
