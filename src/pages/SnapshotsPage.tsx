import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GitBranch, GitMerge, GitPullRequest, Clock, 
  ChevronRight, Plus, RotateCcw, Archive
} from "lucide-react";

const MOCK_VERSIONS = [
  {
    id: 1,
    versionNumber: 5,
    commitMessage: "Add user authentication",
    userId: "user_1",
    createdAt: "2026-04-28T10:30:00Z",
    diffSummary: "+150 lines, -20 lines",
  },
  {
    id: 2,
    versionNumber: 4,
    commitMessage: "Fix navigation bug",
    userId: "user_1",
    createdAt: "2026-04-27T15:20:00Z",
    diffSummary: "+30 lines, -15 lines",
  },
  {
    id: 3,
    versionNumber: 3,
    commitMessage: "Update dependencies",
    userId: "user_2",
    createdAt: "2026-04-26T09:00:00Z",
    diffSummary: "+5 lines, -5 lines",
  },
  {
    id: 4,
    versionNumber: 2,
    commitMessage: "Initial layout setup",
    userId: "user_1",
    createdAt: "2026-04-25T14:00:00Z",
    diffSummary: "+500 lines, -0 lines",
  },
  {
    id: 5,
    versionNumber: 1,
    commitMessage: "Project created",
    userId: "user_1",
    createdAt: "2026-04-24T10:00:00Z",
    diffSummary: "+100 lines, -0 lines",
  },
];

export default function SnapshotsPage() {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Snapshots & Rollback</h1>
            <p className="text-slate-400 mt-1">Version history and rollback points</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-slate-700">
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Snapshot
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Version List */}
          <div className="lg:col-span-2">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Version History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-800">
                  {MOCK_VERSIONS.map((version, index) => (
                    <div
                      key={version.id}
                      className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        selectedVersion === version.id ? "bg-slate-800/50 border-l-2 border-cyan-500" : ""
                      }`}
                      onClick={() => setSelectedVersion(version.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <GitBranch className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">v{version.versionNumber}.0</span>
                              {index === 0 && (
                                <Badge className="bg-green-500/20 text-green-400">Latest</Badge>
                              )}
                            </div>
                            <p className="text-slate-400 text-sm mt-1">{version.commitMessage}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                              <span>{formatDate(version.createdAt)}</span>
                              <span className="text-cyan-400">{version.diffSummary}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
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
                <CardTitle className="text-white">Snapshot Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedVersion ? (
                  <>
                    <div>
                      <label className="text-slate-400 text-sm">Version</label>
                      <div className="text-white text-lg">v{MOCK_VERSIONS.find(v => v.id === selectedVersion)?.versionNumber}.0</div>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Commit Message</label>
                      <div className="text-white">{MOCK_VERSIONS.find(v => v.id === selectedVersion)?.commitMessage}</div>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Changes</label>
                      <div className="text-cyan-400">{MOCK_VERSIONS.find(v => v.id === selectedVersion)?.diffSummary}</div>
                    </div>
                    <div className="pt-4 flex flex-col gap-2">
                      <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
                        <GitMerge className="w-4 h-4 mr-2" />
                        Restore This Version
                      </Button>
                      <Button variant="outline" className="w-full border-slate-700">
                        <GitPullRequest className="w-4 h-4 mr-2" />
                        Create Branch from Snapshot
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500">Select a version to view details</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Auto-Save Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Auto-snapshots</span>
                  <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Frequency</span>
                  <span className="text-white">Every 30 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Max Snapshots</span>
                  <span className="text-white">50</span>
                </div>
                <Button variant="outline" className="w-full border-slate-700">
                  Configure Auto-Save
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}