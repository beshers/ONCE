import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Key, Plus, Eye, EyeOff, Copy, Trash2, 
  RefreshCw, CheckCircle, AlertTriangle
} from "lucide-react";

const MOCK_VARS = [
  { id: 1, key: "DATABASE_URL", value: "postgresql://...", isSecret: true, environment: "development", isActive: true },
  { id: 2, key: "API_KEY", value: "sk_live_...", isSecret: true, environment: "production", isActive: true },
  { id: 3, key: "DEBUG_MODE", value: "true", isSecret: false, environment: "development", isActive: true },
  { id: 4, key: "MAX_CONNECTIONS", value: "100", isSecret: false, environment: "production", isActive: true },
];

export default function EnvVariablesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});

  const toggleSecret = (id: number) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Environment Variables</h1>
            <p className="text-slate-400 mt-1">Manage environment variables for your projects</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Variable
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="development">Development</TabsTrigger>
            <TabsTrigger value="staging">Staging</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card className="bg-[#12121a] border-slate-800">
              <CardContent className="p-0">
                <div className="divide-y divide-slate-800">
                  {MOCK_VARS
                    .filter(v => activeTab === "all" || v.environment === activeTab)
                    .map((variable) => (
                      <div key={variable.id} className="p-4 hover:bg-slate-800/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Key className="w-5 h-5 text-cyan-400" />
                            <div>
                              <div className="text-white font-medium">{variable.key}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-slate-400 text-sm bg-slate-800 px-2 py-1 rounded">
                                  {variable.isSecret && !showSecrets[variable.id] 
                                    ? "••••••••" 
                                    : variable.value}
                                </code>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-slate-700">
                              {variable.environment}
                            </Badge>
                            {variable.isSecret && (
                              <Badge className="bg-yellow-500/20 text-yellow-400">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Secret
                              </Badge>
                            )}
                            {variable.isActive ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => toggleSecret(variable.id)}
                            >
                              {variable.isSecret ? (
                                showSecrets[variable.id] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )
                              ) : null}
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-white font-medium">Sync Variables</div>
                  <div className="text-slate-400 text-sm">Sync with deployment</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Copy className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-white font-medium">Export .env</div>
                  <div className="text-slate-400 text-sm">Download env file</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-white font-medium">Import .env</div>
                  <div className="text-slate-400 text-sm">Upload env file</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}