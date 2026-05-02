import { trpc } from "@/lib/trpcClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Medal, Crown, Zap, Users, Star
} from "lucide-react";

export default function LeaderboardPage() {
  const { data: leaderboard } = trpc.gamification.leaderboard.useQuery();
  const { data: allBadges } = trpc.gamification.allBadges.useQuery();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-slate-400 text-sm">Top developers ranked by XP and activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{(leaderboard || [])[0]?.stats?.xp || 0}</p>
            <p className="text-xs text-slate-400">Top XP Score</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/10 to-violet-600/10 border-cyan-500/20">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{(leaderboard || []).length}</p>
            <p className="text-xs text-slate-400">Active Developers</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{(allBadges || []).length}</p>
            <p className="text-xs text-slate-400">Available Badges</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#13131f] border-white/5">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Top Developers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(leaderboard || []).length === 0 && (
            <div className="text-center py-12 text-slate-600">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No leaderboard data yet. Start coding to earn XP!</p>
            </div>
          )}
          {(leaderboard || []).map((entry, index) => {
            const rank = index + 1;
            const xpForNextLevel = ((entry.stats?.level || 1) * (entry.stats?.level || 1)) * 100;
            const xpProgress = Math.min(((entry.stats?.xp || 0) / xpForNextLevel) * 100, 100);
            return (
              <div
                key={entry.stats?.id}
                className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                  rank <= 3 ? "bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/10" : "bg-white/[0.02] border border-white/5"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  rank === 1 ? "bg-amber-500 text-white" :
                  rank === 2 ? "bg-slate-400 text-white" :
                  rank === 3 ? "bg-orange-600 text-white" :
                  "bg-white/5 text-slate-500"
                }`}>
                  {rank}
                </div>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={entry.user?.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-white text-sm">
                    {entry.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{entry.user?.name || "User"}</p>
                    {rank === 1 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[9px] h-4">
                      Lv.{entry.stats?.level || 1}
                    </Badge>
                    <div className="flex-1 max-w-[120px]">
                      <Progress value={xpProgress} className="h-1 bg-white/5" />
                    </div>
                    <span className="text-[10px] text-slate-500">{entry.stats?.xp || 0} XP</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold">{entry.stats?.xp || 0}</span>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    {entry.stats?.projectsCreated || 0} projects · {entry.stats?.snippetsShared || 0} snippets
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Badges */}
      <Card className="bg-[#13131f] border-white/5">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Medal className="w-4 h-4 text-violet-400" /> Available Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(allBadges || []).map((badge) => (
              <div
                key={badge.id}
                className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-center hover:border-cyan-500/20 transition-all"
              >
                <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-2xl" style={{ backgroundColor: `${badge.color}20` }}>
                  {badge.icon || "🏆"}
                </div>
                <p className="text-xs font-medium text-white">{badge.name}</p>
                <p className="text-[10px] text-slate-500 mt-1">{badge.requirementType}: {badge.requirementValue}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
