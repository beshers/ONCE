import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, ArrowRight, AlertTriangle, CheckCircle, 
  Info, ExternalLink, RefreshCw
} from "lucide-react";

const MOCK_DEPENDENCIES = [
  { name: "react", version: "^18.2.0", type: "production", outdated: false },
  { name: "react-dom", version: "^18.2.0", type: "production", outdated: false },
  { name: "typescript", version: "^5.0.0", type: "development", outdated: true },
  { name: "vite", version: "^4.3.0", type: "development", outdated: false },
  { name: "tailwindcss", version: "^3.3.0", type: "development", outdated: false },
  { name: "lucide-react", version: "^0.264.0", type: "production", outdated: true },
  { name: "zod", version: "^3.21.0", type: "production", outdated: false },
  { name: "@trpc/server", version: "^10.37.0", type: "production", outdated: false },
];

export default function DependencyPage() {
  const [selectedDep, setSelectedDep] = useState<string | null>(null);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "production": return "bg-green-500/20 text-green-400";
      case "development": return "bg-blue-500/20 text-blue-400";
      case "peer": return "bg-purple-500/20 text-purple-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Dependency Visualizer</h1>
            <p className="text-slate-400 mt-1">Visualize and manage project dependencies</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-slate-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600">
              <Package className="w-4 h-4 mr-2" />
              Update All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dependency Graph */}
          <div className="lg:col-span-2">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Dependency Graph</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-[400px] bg-slate-900 rounded-lg overflow-hidden">
                  {/* Simple visualization */}
                  <div className="absolute inset-0 p-8">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-lg mb-8">
                        app
                      </div>
                      <ArrowRight className="w-6 h-6 text-slate-600 mb-4 rotate-90" />
                      <div className="flex gap-8 flex-wrap justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-2">
                            <Package className="w-5 h-5" />
                          </div>
                          <span className="text-slate-400 text-sm">react</span>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                            <Package className="w-5 h-5" />
                          </div>
                          <span className="text-slate-400 text-sm">vite</span>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
                            <Package className="w-5 h-5" />
                          </div>
                          <span className="text-slate-400 text-sm">zod</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dependency List */}
            <Card className="bg-[#12121a] border-slate-800 mt-4">
              <CardHeader>
                <CardTitle className="text-white">All Dependencies</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-800">
                  {MOCK_DEPENDENCIES.map((dep) => (
                    <div
                      key={dep.name}
                      className={`p-4 hover:bg-slate-800/50 cursor-pointer flex items-center justify-between ${
                        selectedDep === dep.name ? "bg-slate-800/50 border-l-2 border-cyan-500" : ""
                      }`}
                      onClick={() => setSelectedDep(dep.name)}
                    >
                      <div className="flex items-center gap-4">
                        <Package className="w-5 h-5 text-cyan-400" />
                        <div>
                          <div className="text-white font-medium">{dep.name}</div>
                          <div className="text-slate-400 text-sm">{dep.version}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getTypeColor(dep.type)}>{dep.type}</Badge>
                        {dep.outdated ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Update
                          </Badge>
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Panel */}
          <div className="space-y-4">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Dependencies</span>
                  <span className="text-white font-bold">{MOCK_DEPENDENCIES.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Production</span>
                  <span className="text-green-400">{MOCK_DEPENDENCIES.filter(d => d.type === "production").length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Development</span>
                  <span className="text-blue-400">{MOCK_DEPENDENCIES.filter(d => d.type === "development").length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Outdated</span>
                  <span className="text-yellow-400">{MOCK_DEPENDENCIES.filter(d => d.outdated).length}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Selected Package</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDep ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 text-sm">Package</label>
                      <div className="text-white">{selectedDep}</div>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Current Version</label>
                      <div className="text-white">{MOCK_DEPENDENCIES.find(d => d.name === selectedDep)?.version}</div>
                    </div>
                    <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
                      Update Package
                    </Button>
                    <Button variant="outline" className="w-full border-slate-700">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on npm
                    </Button>
                  </div>
                ) : (
                  <p className="text-slate-500">Select a dependency to view details</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}