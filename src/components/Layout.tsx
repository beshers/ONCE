import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  Home, FolderOpen, Code2, Terminal, MessageSquare,
  FileCode2, Users, Bell, Settings, LogOut, Search,
  Menu, ChevronLeft, ChevronRight,
  Globe,
  Trophy, Palette, Zap, GitBranch, Bookmark,
  Building2, Plug, FileText, Radio, Package, Rocket,
  Bug, Key, Flame, MonitorUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: FolderOpen, label: "Projects", path: "/projects" },
  { icon: Code2, label: "Editor", path: "/editor" },
  { icon: Terminal, label: "Terminal", path: "/terminal" },
  { icon: MonitorUp, label: "Local Agent", path: "/local-agent" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: FileCode2, label: "Snippets", path: "/snippets" },
  { icon: Globe, label: "Social Feed", path: "/social" },
  { icon: Users, label: "Friends", path: "/friends" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  // New feature navigation items
  { icon: Code2, label: "Playground", path: "/playground" },
  { icon: Palette, label: "Whiteboard", path: "/whiteboard" },
  { icon: Zap, label: "Hackathons", path: "/hackathons" },
  { icon: GitBranch, label: "Snapshots", path: "/snapshots" },
  { icon: Bookmark, label: "Bookmarks", path: "/bookmarks" },
  { icon: Building2, label: "Teams", path: "/organizations" },
  { icon: Plug, label: "Integrations", path: "/integrations" },
  { icon: FileText, label: "Docs", path: "/documentation" },
  { icon: Radio, label: "Streaming", path: "/stream" },
  { icon: Package, label: "Dependencies", path: "/dependencies" },
  { icon: Rocket, label: "Deploy", path: "/deployments" },
  { icon: Bug, label: "Bugs", path: "/bugs" },
  { icon: Key, label: "Env Vars", path: "/env-vars" },
  { icon: Flame, label: "Activity", path: "/activity" },
  { icon: Palette, label: "Themes", path: "/themes" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const initials = user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "U";

  const NavItem = ({ icon: Icon, label, path }: { icon: typeof Home; label: string; path: string }) => {
    const isActive = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-cyan-400" : ""}`} />
              {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
              {!collapsed && label === "Notifications" && unreadCount && unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-[10px] h-5 min-w-5 flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-white/5 bg-[#0f0f1a] transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent truncate">
              OCNE
            </span>
          )}
        </div>

        {/* User */}
        <div className="px-3 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 ring-2 ring-cyan-500/30 flex-shrink-0">
              <AvatarImage src={user?.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.name || user?.username || "Developer"}</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] text-emerald-400">Online</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase text-slate-600 font-semibold px-3 py-2 tracking-wider">
            {!collapsed && "Main"}
          </div>
          {navItems.slice(0, 5).map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          <div className="text-[10px] uppercase text-slate-600 font-semibold px-3 py-2 tracking-wider mt-4">
            {!collapsed && "Community"}
          </div>
          {navItems.slice(5, 9).map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          <div className="text-[10px] uppercase text-slate-600 font-semibold px-3 py-2 tracking-wider mt-4">
            {!collapsed && "Account"}
          </div>
          <NavItem {...navItems[9]} />
          <button
            onClick={() => logout()}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-10 border-t border-white/5 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild className="md:hidden fixed top-3 left-3 z-50">
          <Button variant="ghost" size="icon" className="bg-[#0f0f1a]/80 backdrop-blur border border-white/10">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 bg-[#0f0f1a] border-white/5 p-0">
          <div className="h-16 flex items-center gap-3 px-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              OCNE
            </span>
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  location.pathname === item.path
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.label === "Notifications" && unreadCount && unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            ))}
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-[#0f0f1a]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-3 md:hidden">
            <span className="font-bold text-sm">OCNE</span>
          </div>
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects, snippets, users..."
              className="bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none w-full"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(`/search?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-slate-400 hover:text-slate-200"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="w-5 h-5" />
              {unreadCount && unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-200"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
