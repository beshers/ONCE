import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, Users, Trophy, Clock, Play, 
  ChevronRight, Medal, Target, Zap
} from "lucide-react";

const MOCK_HACKATHONS = [
  {
    id: 1,
    name: "AI Code Challenge 2026",
    description: "Build AI-powered coding solutions",
    startDate: "2026-05-15",
    endDate: "2026-05-17",
    status: "upcoming",
    participants: 45,
    maxParticipants: 100,
    prize: "$5,000",
  },
  {
    id: 2,
    name: "Web3 Builder Marathon",
    description: "Create decentralized applications",
    startDate: "2026-04-01",
    endDate: "2026-04-03",
    status: "active",
    participants: 78,
    maxParticipants: 150,
    prize: "$10,000",
  },
  {
    id: 3,
    name: "Open Source Sprint",
    description: "Contribute to open source projects",
    startDate: "2026-03-15",
    endDate: "2026-03-17",
    status: "completed",
    participants: 120,
    maxParticipants: 200,
    prize: "$3,000",
  },
];

export default function HackathonPage() {
  const [activeTab, setActiveTab] = useState("upcoming");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-blue-500/20 text-blue-400";
      case "active": return "bg-green-500/20 text-green-400";
      case "completed": return "bg-slate-500/20 text-slate-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Virtual Hackathons</h1>
            <p className="text-slate-400 mt-1">Compete in coding challenges and win prizes</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600">
            <Play className="w-4 h-4 mr-2" />
            Create Hackathon
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="my-hackathons">My Hackathons</TabsTrigger>
          </TabsList>

          {["upcoming", "active", "completed", "my-hackathons"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_HACKATHONS
                  .filter(h => tab === "my-hackathons" ? h.id === 1 : h.status === tab)
                  .map((hackathon) => (
                    <Card key={hackathon.id} className="bg-[#12121a] border-slate-800 hover:border-cyan-500/50 transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <Badge className={getStatusColor(hackathon.status)}>
                            {hackathon.status}
                          </Badge>
                          {hackathon.status === "active" && (
                            <div className="flex items-center text-red-400 text-sm">
                              <Clock className="w-4 h-4 mr-1" />
                              Live
                            </div>
                          )}
                        </div>
                        <CardTitle className="text-white text-xl mt-2">
                          {hackathon.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-slate-400 text-sm">{hackathon.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center text-slate-300">
                            <Calendar className="w-4 h-4 mr-2 text-cyan-400" />
                            {hackathon.startDate}
                          </div>
                          <div className="flex items-center text-slate-300">
                            <Users className="w-4 h-4 mr-2 text-cyan-400" />
                            {hackathon.participants}/{hackathon.maxParticipants}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                          <div className="flex items-center text-yellow-400">
                            <Trophy className="w-5 h-5 mr-2" />
                            {hackathon.prize}
                          </div>
                          <Button variant="ghost" size="sm" className="text-cyan-400">
                            View Details
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Leaderboard Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Top Performers</h2>
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800">
                {[
                  { rank: 1, name: "CodeMaster", score: 2500, badges: 12 },
                  { rank: 2, name: "DevNinja", score: 2350, badges: 10 },
                  { rank: 3, name: "ByteRunner", score: 2200, badges: 8 },
                  { rank: 4, name: "SyntaxHero", score: 2100, badges: 7 },
                  { rank: 5, name: "AlgoArtist", score: 1950, badges: 6 },
                ].map((user, i) => (
                  <div key={user.rank} className="flex items-center justify-between p-4 hover:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-slate-700"
                      }`}>
                        <span className="text-white font-bold">{user.rank}</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.name}</div>
                        <div className="text-slate-400 text-sm">{user.badges} badges earned</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-cyan-400 font-bold">{user.score.toLocaleString()} pts</div>
                      {i < 3 && <Medal className={`w-5 h-5 ${i === 0 ? "text-yellow-400" : "text-slate-400"}`} />}
                    </div>
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