import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Webhook, Plug, Plus, Settings, Trash2, 
  RefreshCw, CheckCircle, XCircle, ExternalLink
} from "lucide-react";

const MOCK_INTEGRATIONS = [
  { 
    id: 1, 
    name: "GitHub", 
    provider: "github", 
    connected: true,
    lastSync: "2026-04-28T10:00:00Z" 
  },
  { 
    id: 2, 
    name: "Vercel", 
    provider: "vercel", 
    connected: true,
    lastSync: "2026-04-28T09:30:00Z" 
  },
  { 
    id: 3, 
    name: "Netlify", 
    provider: "netlify", 
    connected: false,
    lastSync: null 
  },
  { 
    id: 4, 
    name: "GitLab", 
    provider: "gitlab", 
    connected: false,
    lastSync: null 
  },
];

const MOCK_WEBHOOKS = [
  { 
    id: 1, 
    name: "Production Deploy", 
    url: "https://api.example.com/webhook/deploy",
    event: "deployment.completed",
    isActive: true,
    lastTriggered: "2026-04-28T08:00:00Z"
  },
  { 
    id: 2, 
    name: "Bug Notification", 
    url: "https://api.example.com/webhook/bugs",
    event: "bug.reported",
    isActive: true,
    lastTriggered: "2026-04-27T15:00:00Z"
  },
];

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState("integrations");

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Integrations & Webhooks</h1>
            <p className="text-slate-400 mt-1">Connect external services and configure webhooks</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {MOCK_INTEGRATIONS.map((integration) => (
                <Card key={integration.id} className="bg-[#12121a] border-slate-800">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                        <Plug className="w-6 h-6 text-cyan-400" />
                      </div>
                      {integration.connected ? (
                        <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                      ) : (
                        <Badge className="bg-slate-500/20 text-slate-400">Not Connected</Badge>
                      )}
                    </div>
                    <CardTitle className="text-white text-lg mt-3">{integration.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {integration.connected ? (
                      <>
                        <div className="text-sm text-slate-400">
                          Last synced: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : "N/A"}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 border-slate-700">
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Sync
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 border-slate-700">
                            <Settings className="w-4 h-4 mr-1" />
                            Settings
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
                        <Plug className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Add New Integration */}
              <Card className="bg-[#12121a] border-slate-800 border-dashed">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                  <Plus className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-slate-400 mb-4">Add more integrations</p>
                  <Button variant="outline" className="border-slate-700">
                    Browse Integrations
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Webhook
              </Button>
            </div>

            <div className="space-y-4">
              {MOCK_WEBHOOKS.map((webhook) => (
                <Card key={webhook.id} className="bg-[#12121a] border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                          <Webhook className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{webhook.name}</div>
                          <div className="text-slate-400 text-sm flex items-center gap-2">
                            {webhook.url}
                            <ExternalLink className="w-3 h-3" />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="border-slate-700 text-xs">
                              {webhook.event}
                            </Badge>
                            {webhook.isActive ? (
                              <span className="flex items-center text-xs text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="flex items-center text-xs text-red-400">
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-slate-700">
                          <Settings className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}