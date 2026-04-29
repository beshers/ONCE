import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Rocket, Play, Pause, CheckCircle, XCircle, 
  Clock, ExternalLink, RefreshCw, Plus
} from "lucide-react";

const MOCK_DEPLOYMENTS = [
  { 
    id: 1, 
    projectId: 1, 
    environment: "production", 
    status: "deployed", 
    commitSha: "abc123",
    deployedUrl: "https://myapp.vercel.app",
    startedAt: "2026-04-28T10:00:00Z",
    completedAt: "2026-04-28T10:05:00Z"
  },
  { 
    id: 2, 
    projectId: 1, 
    environment: "staging", 
    status: "building", 
    commitSha: "def456",
    deployedUrl: null,
    startedAt: "2026-04-28T11:00:00Z",
    completedAt: null
  },
  { 
    id: 3, 
    projectId: 1, 
    environment: "development", 
    status: "failed", 
    commitSha: "ghi789",
    deployedUrl: null,
    startedAt: "2026-04-27T15:00:00Z",
    completedAt: "2026-04-27T15:03:00Z"
  },
];

export default function DeploymentPage() {
  const [activeTab, setActiveTab] = useState("all");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "deployed": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "building": return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "deployed": return "bg-green-500/20 text-green-400";
      case "building": return "bg-blue-500/20 text-blue-400";
      case "failed": return "bg-red-500/20 text-red-400";
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Deployment Pipeline</h1>
            <p className="text-slate-400 mt-1">CI/CD pipelines and deployments</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600">
            <Rocket className="w-4 h-4 mr-2" />
            New Deployment
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="staging">Staging</TabsTrigger>
            <TabsTrigger value="development">Development</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-4">
              {MOCK_DEPLOYMENTS
                .filter(d => activeTab === "all" || d.environment === activeTab)
                .map((deployment) => (
                  <Card key={deployment.id} className="bg-[#12121a] border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                            {getStatusIcon(deployment.status)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">Deployment #{deployment.id}</span>
                              <Badge className={getStatusColor(deployment.status)}>
                                {deployment.status}
                              </Badge>
                              <Badge variant="outline" className="border-slate-700">
                                {deployment.environment}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                              <span>Commit: {deployment.commitSha}</span>
                              <span>Started: {new Date(deployment.startedAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {deployment.deployedUrl && (
                            <a
                              href={deployment.deployedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 flex items-center hover:underline"
                            >
                              View <ExternalLink className="w-4 h-4 ml-1" />
                            </a>
                          )}
                          <Button variant="outline" size="sm" className="border-slate-700">
                            Logs
                          </Button>
                          {deployment.status === "deployed" && (
                            <Button variant="outline" size="sm" className="border-slate-700">
                              Rollback
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Pipeline Overview */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Pipeline Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {["Development", "Staging", "Production"].map((env, i) => (
              <Card key={env} className="bg-[#12121a] border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">{env}</span>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {MOCK_DEPLOYMENTS.filter(d => d.environment === env.toLowerCase() && d.status === "deployed").length}
                  </div>
                  <div className="text-sm text-slate-500">active deployments</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}