import { useEffect } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/lib/trpcClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmbeddedTerminal from "@/components/EmbeddedTerminal";

import {
  FolderOpen, Code2, Terminal, MessageSquare, Users,
  FileCode2, Zap, Clock, ChevronRight, Trophy, Globe, Plus
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: stats, isLoading: statsLoading } = trpc.activity.dashboardStats.useQuery();
  const { data: recentProjects } = trpc.project.list.useQuery();
  const { data: userStats } = trpc.gamification.stats.useQuery();
  const { data: feed } = trpc.social.feed.useQuery();
  const { data: badges } = trpc.gamification.badges.useQuery();

  // Check and award badges
  const checkBadges = trpc.gamification.checkBadges.useMutation({
    onSuccess: () => {
      utils.gamification.stats.invalidate();
      utils.gamification.badges.invalidate();
    },
  });

  useEffect(() => {
    checkBadges.mutate();
  }, []);

  const statCards = [
    { label: "Projects", value: stats?.projects ?? 0, icon: FolderOpen, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Snippets", value: stats?.snippets ?? 0, icon: FileCode2, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Collaborating", value: stats?.collaborating ?? 0, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Unread Messages", value: stats?.unreadMessages ?? 0, icon: MessageSquare, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  const quickActions = [
    { icon: Plus, label: "New Project", desc: "Start coding", onClick: () => navigate("/projects") },
    { icon: Code2, label: "Code Editor", desc: "Write & edit", onClick: () => navigate("/editor") },
    { icon: Terminal, label: "Terminal", desc: "Run commands", onClick: () => navigate("/terminal") },
    { icon: MessageSquare, label: "Chat", desc: "Message team", onClick: () => navigate("/chat") },
  ];

  const xpForNextLevel = ((userStats?.level || 1) * (userStats?.level || 1)) * 100;
  const currentXp = userStats?.xp || 0;
  const xpProgress = Math.min((currentXp / xpForNextLevel) * 100, 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, {user?.name || user?.username || "Developer"}!
        </h1>
        <p className="text-slate-400 text-sm">Here's your workspace overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-[#13131f] border-white/5 hover:border-white/10 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{statsLoading ? "—" : stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* XP / Level Progress */}
      {userStats && (
        <Card className="bg-[#13131f] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Level {userStats.level}</p>
                  <p className="text-xs text-slate-500">{currentXp} / {xpForNextLevel} XP to next level</p>
                </div>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                <Zap className="w-3 h-3 mr-1" /> {userStats.xp} XP
              </Badge>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="bg-[#13131f] border border-white/5 rounded-xl p-4 text-left hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
          >
            <action.icon className="w-6 h-6 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-sm font-semibold text-white">{action.label}</h3>
            <p className="text-xs text-slate-500 mt-1">{action.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <Card className="lg:col-span-2 bg-[#13131f] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Recent Projects
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300" onClick={() => navigate("/projects")}>
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProjects?.owned?.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No projects yet</p>
                <Button variant="ghost" size="sm" className="text-cyan-400 mt-2" onClick={() => navigate("/projects")}>
                  Create your first project
                </Button>
              </div>
            )}
            {(recentProjects?.owned || []).slice(0, 5).map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/5 cursor-pointer transition-all border border-white/5 hover:border-cyan-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{project.name}</p>
                    <p className="text-xs text-slate-500">{project.language} · {project.stars} stars</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Badges */}
          <Card className="bg-[#13131f] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {badges?.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No badges yet. Keep coding!</p>
              )}
              <div className="flex flex-wrap gap-2">
                {(badges || []).slice(0, 6).map((ub) => (
                  <div
                    key={ub.userBadge.id}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: ub.badge?.color ? `${ub.badge.color}20` : "#00d4ff20" }}
                    title={ub.badge?.name || "Badge"}
                  >
                    {ub.badge?.icon || "🏆"}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Social Feed Preview */}
          <Card className="bg-[#13131f] border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" /> Community
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-cyan-400" onClick={() => navigate("/social")}>
                View
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(feed || []).slice(0, 3).map((item) => (
                <div key={item.post.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-[10px] text-white font-bold">
                      {item.author?.name?.charAt(0) || "U"}
                    </div>
                    <span className="text-xs text-slate-300">{item.author?.name || "User"}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.post.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
                    <span className="flex items-center gap-1"><span className="text-red-400">♥</span> {item.post.likes}</span>
                    <span className="flex items-center gap-1"><span className="text-cyan-400">💬</span> {item.post.comments}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-[#13131f] border-white/5 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Workspace Terminal</h2>
            <p className="text-xs text-slate-500">The same terminal experience, available directly from the dashboard.</p>
          </div>
          <Button variant="ghost" size="sm" className="text-cyan-400" onClick={() => navigate("/terminal")}>
            Full page <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <EmbeddedTerminal compact title="Dashboard Terminal" />
      </Card>
    </div>
  );
}
