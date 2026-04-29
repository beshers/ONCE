import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bug, Plus, AlertTriangle, CheckCircle, 
  Clock, User, Tag, MessageSquare
} from "lucide-react";

const MOCK_BUGS = [
  { 
    id: 1, 
    title: "Login redirect loop on mobile", 
    severity: "critical",
    status: "open",
    tags: ["mobile", "auth"],
    reporterId: "user_1",
    assignedTo: "user_2",
    createdAt: "2026-04-28T10:00:00Z"
  },
  { 
    id: 2, 
    title: "Dashboard not loading for new users", 
    severity: "high",
    status: "in_progress",
    tags: ["dashboard", "performance"],
    reporterId: "user_1",
    assignedTo: "user_3",
    createdAt: "2026-04-27T15:00:00Z"
  },
  { 
    id: 3, 
    title: "Typo in error message", 
    severity: "low",
    status: "resolved",
    tags: ["ui", "text"],
    reporterId: "user_2",
    assignedTo: null,
    createdAt: "2026-04-26T09:00:00Z"
  },
];

export default function BugReportPage() {
  const [activeTab, setActiveTab] = useState("open");

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-400";
      case "high": return "bg-orange-500/20 text-orange-400";
      case "medium": return "bg-yellow-500/20 text-yellow-400";
      case "low": return "bg-blue-500/20 text-blue-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-500/20 text-red-400";
      case "in_progress": return "bg-blue-500/20 text-blue-400";
      case "resolved": return "bg-green-500/20 text-green-400";
      case "closed": return "bg-slate-500/20 text-slate-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Bug Reports</h1>
            <p className="text-slate-400 mt-1">Smart bug reporting and tagging system</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            Report Bug
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_BUGS
                .filter(b => activeTab === "all" || b.status === activeTab)
                .map((bug) => (
                  <Card key={bug.id} className="bg-[#12121a] border-slate-800 hover:border-cyan-500/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Badge className={getSeverityColor(bug.severity)}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {bug.severity}
                        </Badge>
                        <Badge className={getStatusColor(bug.status)}>{bug.status}</Badge>
                      </div>
                      <CardTitle className="text-white text-lg mt-2">{bug.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {bug.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-slate-700 text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-slate-400">
                          <User className="w-4 h-4 mr-1" />
                          {bug.assignedTo || "Unassigned"}
                        </div>
                        <div className="flex items-center text-slate-400">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(bug.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Bug className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{MOCK_BUGS.filter(b => b.status === "open").length}</div>
                  <div className="text-sm text-slate-400">Open Bugs</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{MOCK_BUGS.filter(b => b.severity === "critical").length}</div>
                  <div className="text-sm text-slate-400">Critical</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{MOCK_BUGS.filter(b => b.status === "in_progress").length}</div>
                  <div className="text-sm text-slate-400">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{MOCK_BUGS.filter(b => b.status === "resolved").length}</div>
                  <div className="text-sm text-slate-400">Resolved</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}