import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, Users, Plus, Settings, Shield, 
  Crown, UserPlus, Mail, MoreHorizontal
} from "lucide-react";

const MOCK_ORGS = [
  { 
    id: 1, 
    name: "DevTeam Alpha", 
    slug: "devteam-alpha", 
    members: 8, 
    plan: "pro",
    description: "Main development team"
  },
  { 
    id: 2, 
    name: "Open Source Collective", 
    slug: "osc", 
    members: 25, 
    plan: "free",
    description: "Community contributors"
  },
];

const MOCK_MEMBERS = [
  { id: 1, name: "Alice Chen", email: "alice@example.com", role: "owner", avatar: "AC" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "admin", avatar: "BS" },
  { id: 3, name: "Carol White", email: "carol@example.com", role: "member", avatar: "CW" },
];

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner": return "bg-yellow-500/20 text-yellow-400";
      case "admin": return "bg-purple-500/20 text-purple-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Organization & Teams</h1>
            <p className="text-slate-400 mt-1">Manage workspaces and collaborate with your team</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_ORGS.map((org) => (
                <Card key={org.id} className="bg-[#12121a] border-slate-800 hover:border-cyan-500/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <Badge className={org.plan === "pro" ? "bg-purple-500/20 text-purple-400" : "bg-slate-500/20 text-slate-400"}>
                        {org.plan}
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-xl mt-3">{org.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-slate-400 text-sm">{org.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-slate-300">
                        <Users className="w-4 h-4 mr-2 text-cyan-400" />
                        {org.members} members
                      </div>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Create New Card */}
              <Card className="bg-[#12121a] border-slate-800 border-dashed">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                  <Building2 className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-slate-400 mb-4">Create a new organization</p>
                  <Button variant="outline" className="border-slate-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Org
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Team Members</CardTitle>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-800">
                  {MOCK_MEMBERS.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-slate-800/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium">
                          {member.avatar}
                        </div>
                        <div>
                          <div className="text-white font-medium">{member.name}</div>
                          <div className="text-slate-400 text-sm">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={getRoleColor(member.role)}>{member.role}</Badge>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Organization Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-slate-400 text-sm">Organization Name</label>
                  <Input defaultValue="DevTeam Alpha" className="mt-1 bg-slate-800 border-slate-700" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Slug</label>
                  <Input defaultValue="devteam-alpha" className="mt-1 bg-slate-800 border-slate-700" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Description</label>
                  <Input defaultValue="Main development team" className="mt-1 bg-slate-800 border-slate-700" />
                </div>
                <Button className="bg-cyan-500 hover:bg-cyan-600">Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}