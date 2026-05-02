import { useState } from "react";
import { trpc } from "@/lib/trpcClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  User, Shield, Bell,
  Save, LogOut
} from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();
  const [editMode, setEditMode] = useState(false);


  const [form, setForm] = useState({
    name: user?.name || "",
    username: user?.username || "",
    bio: user?.bio || "",
    avatar: user?.avatar || "",
    email: user?.email || "",
  });

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated!");
      utils.user.me.invalidate();
      setEditMode(false);
    },
  });

  const initials = user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-[#13131f] border border-white/5">
          <TabsTrigger value="profile" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <User className="w-3.5 h-3.5 mr-1.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <Shield className="w-3.5 h-3.5 mr-1.5" /> Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <Bell className="w-3.5 h-3.5 mr-1.5" /> Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="bg-[#13131f] border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 ring-4 ring-cyan-500/20">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-white text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-white">{user?.name || "Developer"}</h3>
                  <p className="text-sm text-slate-500">@{user?.username || "user"}</p>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] h-5 mt-1">
                    {user?.role || "user"}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-cyan-400 hover:text-cyan-300"
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? "Cancel" : "Edit"}
                </Button>
              </div>

              {editMode && (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Display Name</label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Username</label>
                      <Input
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Bio</label>
                    <Textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Avatar URL</label>
                    <Input
                      value={form.avatar}
                      onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="https://..."
                    />
                  </div>
                  <Button
                    onClick={() => updateProfile.mutate(form)}
                    className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#13131f] border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-sm text-slate-400">Email</span>
                <span className="text-sm text-white">{user?.email || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-sm text-slate-400">Role</span>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">{user?.role || "user"}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-sm text-slate-400">Joined</span>
                <span className="text-sm text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-400">Last Login</span>
                <span className="text-sm text-white">{user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : "—"}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-4 space-y-4">
          <Card className="bg-[#13131f] border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Change Password</p>
                  <p className="text-xs text-slate-500">Update your password regularly</p>
                </div>
                <Button variant="ghost" size="sm" className="text-cyan-400">Change</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-500">Add an extra layer of security</p>
                </div>
                <Badge variant="outline" className="border-slate-600 text-slate-500 text-[10px]">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#13131f] border-white/5 border-red-500/10">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-red-400">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm("Are you sure you want to log out?")) {
                    logout();
                  }
                }}
              >
                <LogOut className="w-4 h-4 mr-2" /> Log Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="bg-[#13131f] border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Friend Requests", desc: "When someone sends you a friend request" },
                { label: "Project Invites", desc: "When you're invited to collaborate" },
                { label: "Code Reviews", desc: "When someone reviews your code" },
                { label: "Mentions", desc: "When someone mentions you in chat" },
                { label: "System Updates", desc: "Important platform announcements" },
              ].map((pref) => (
                <div key={pref.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm text-white">{pref.label}</p>
                    <p className="text-xs text-slate-500">{pref.desc}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-white/20 accent-cyan-500" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
