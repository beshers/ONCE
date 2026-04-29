import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Flame, Calendar, TrendingUp, Clock, 
  Award, Target, Zap
} from "lucide-react";

// Generate heatmap data for the past year
const generateHeatmapData = () => {
  const data = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfYear = Math.floor(Math.random() * 5);
    data.push({
      date: date.toISOString().split("T")[0],
      count: dayOfYear,
      level: dayOfYear === 0 ? 0 : dayOfYear <= 2 ? 1 : dayOfYear <= 4 ? 2 : 3,
    });
  }
  return data;
};

const MOCK_STATS = {
  totalContributions: 1247,
  currentStreak: 12,
  longestStreak: 45,
  totalCodingHours: 328,
  averageDaily: 3.4,
  topLanguage: "TypeScript",
};

export default function ActivityHeatmapPage() {
  const [heatmapData] = useState(generateHeatmapData());
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return "bg-slate-800";
      case 1: return "bg-cyan-900";
      case 2: return "bg-cyan-700";
      case 3: return "bg-cyan-500";
      default: return "bg-slate-800";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Activity Heatmaps</h1>
            <p className="text-slate-400 mt-1">Track your coding activity over time</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{MOCK_STATS.totalContributions}</div>
                  <div className="text-sm text-slate-400">Total Contributions</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{MOCK_STATS.currentStreak}</div>
                  <div className="text-sm text-slate-400">Day Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{MOCK_STATS.totalCodingHours}h</div>
                  <div className="text-sm text-slate-400">Coding Hours</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{MOCK_STATS.averageDaily}h</div>
                  <div className="text-sm text-slate-400">Daily Average</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Heatmap */}
        <Card className="bg-[#12121a] border-slate-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Contribution Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {months.map((month, i) => (
                  <div key={month} className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">{month}</span>
                    <div className="flex flex-col gap-1">
                      {Array.from({ length: 4 }).map((_, weekIdx) => (
                        <div key={weekIdx} className="flex gap-1">
                          {heatmapData
                            .filter((_, idx) => Math.floor(idx / 7) === i * 4 + weekIdx)
                            .slice(0, 7)
                            .map((day, dayIdx) => (
                              <div
                                key={day.date}
                                className={`w-3 h-3 rounded-sm ${getLevelColor(day.level)}`}
                                title={`${day.date}: ${day.count} contributions`}
                              />
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-4">
                <span className="text-slate-500 text-sm">Less</span>
                {[0, 1, 2, 3].map((level) => (
                  <div key={level} className={`w-3 h-3 rounded-sm ${getLevelColor(level)}`} />
                ))}
                <span className="text-slate-500 text-sm">More</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity by Day of Week */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#12121a] border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Activity by Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {days.map((day, i) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-slate-400 w-12">{day}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 rounded-full" 
                        style={{ width: `${Math.random() * 80 + 20}%` }}
                      />
                    </div>
                    <span className="text-slate-400 w-8 text-right">{Math.floor(Math.random() * 50 + 10)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Top Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["TypeScript", "JavaScript", "Python", "Rust", "Go"].map((lang, i) => (
                  <div key={lang} className="flex items-center gap-3">
                    <span className="text-slate-400 w-24">{lang}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 rounded-full" 
                        style={{ width: `${100 - i * 15}%` }}
                      />
                    </div>
                    <span className="text-slate-400 w-8 text-right">{100 - i * 15}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}