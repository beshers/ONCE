import { Link } from "react-router";
import { ArrowLeft, Cookie, Database, HardDrive, LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const savedItems = [
  {
    title: "Login and session cookies",
    text: "Used to keep you signed in and protect authenticated pages, chat, files, downloads, and account settings.",
    icon: LockKeyhole,
  },
  {
    title: "Browser storage",
    text: "Used for theme choices, sidebar width, editor drafts, open files, cookie choice, and small interface preferences.",
    icon: HardDrive,
  },
  {
    title: "Feature data",
    text: "Used for profiles, projects, chat, calls, notifications, downloads, and local agent settings when you enable them.",
    icon: Database,
  },
  {
    title: "Windows program data",
    text: "Used by the installed OCNE app for login state, cache files, app settings, and connecting to the same online API as the website.",
    icon: HardDrive,
  },
  {
    title: "Desktop agent data",
    text: "Used only if you install and start the local agent for terminal, device, or local file features.",
    icon: HardDrive,
  },
];

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#070a12] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" className="mb-5 text-slate-300 hover:bg-white/10 hover:text-white">
          <Link to="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </Button>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1220] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 bg-[#111827] p-6 sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              <Cookie className="h-3.5 w-3.5" />
              Cookies and saved data
            </div>
            <h1 className="text-3xl font-bold tracking-tight">What OCNE saves on your device</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              OCNE uses essential cookies and browser storage so the website and Windows program can
              sign you in, remember your settings, restore your workspace, and keep app features
              working. We do not sell this information and we do not use advertising cookies.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-5">
            {savedItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-white/10 bg-white/[0.03] p-4 shadow-none">
                  <Icon className="mb-3 h-5 w-5 text-cyan-300" />
                  <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{item.text}</p>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 border-t border-white/10 p-5 md:grid-cols-2">
            <Card className="border-white/10 bg-[#0b1220] p-5 shadow-none">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Why we save it
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                We use saved data to authenticate you, recover editor work, keep preferences
                consistent between visits, run chat and call features, and make OCNE faster through
                normal browser caching.
              </p>
            </Card>
            <Card className="border-white/10 bg-[#0b1220] p-5 shadow-none">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Database className="h-4 w-4 text-amber-300" />
                Where more account data lives
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Account, project, chat, profile, and collaboration information is saved in the OCNE
                online database through the API. The Windows program connects to the same API, so it
                uses the same account data as the website.
              </p>
            </Card>
            <Card className="border-white/10 bg-[#0b1220] p-5 shadow-none md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <HardDrive className="h-4 w-4 text-cyan-300" />
                How the Windows program works
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The Windows program installs OCNE on your computer and stores the app interface
                locally. When you sign in or use online features, it connects to the OCNE API hosted
                on Render. The API reads and writes the same Aiven MySQL database used by the website.
              </p>
            </Card>
            <Card className="border-white/10 bg-[#0b1220] p-5 shadow-none md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <HardDrive className="h-4 w-4 text-amber-300" />
                How the other programs work
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The Windows and macOS ZIP apps are alternative app packages. The desktop agent is a
                local helper for terminal, device, and file features. These programs may store local
                cache, settings, login state, and connection settings on your computer, and they use
                OCNE online services only for features that need the API or database.
              </p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-white/10 p-5">
            <Button asChild className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Link to="/datenschutz">Read Datenschutz</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10">
              <Link to="/impressum">Read Impressum</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
