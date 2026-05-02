import { useState } from "react";
import { trpc } from "@/lib/trpcClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, Search, UserPlus, Check, X, MessageSquare, UserMinus
} from "lucide-react";

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("all");
  const utils = trpc.useUtils();

  const { data: friends } = trpc.friend.list.useQuery();
  const { data: requests } = trpc.friend.requests.useQuery();
  const { data: searchResults } = trpc.friend.searchUsers.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  const sendRequest = trpc.friend.sendRequest.useMutation({
    onSuccess: async (result) => {
      toast.success(result.status === "accepted" ? "You are friends now!" : "Friend request sent!");
      await utils.friend.list.invalidate();
      await utils.friend.requests.invalidate();
      await utils.chat.directThreads.invalidate();
    },
  });
  const acceptRequest = trpc.friend.accept.useMutation({
    onSuccess: async () => {
      toast.success("Friend request accepted!");
      await utils.friend.list.invalidate();
      await utils.friend.requests.invalidate();
      await utils.chat.directThreads.invalidate();
      setTab("all");
    },
  });
  const removeFriend = trpc.friend.remove.useMutation({
    onSuccess: async () => {
      toast.success("Friend removed");
      await utils.friend.list.invalidate();
      await utils.chat.directThreads.invalidate();
    },
  });

  const acceptedFriends = (friends || []).filter((f) => f.status === "accepted");
  const pendingRequests = (requests || []).filter((r) => r.request.status === "pending");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Friends</h1>
        <p className="text-slate-400 text-sm">Manage your developer network</p>
      </div>

      <Card className="bg-[#13131f] border-white/5">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search developers by username or name..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          {searchQuery.length >= 2 && searchResults && (
            <div className="mt-3 space-y-2">
              {(searchResults || []).length === 0 && <p className="text-xs text-slate-500">No users found</p>}
              {(searchResults || []).map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-white text-xs">
                        {u.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-slate-200">{u.name || u.username}</p>
                      <p className="text-[10px] text-slate-500">@{u.username}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => sendRequest.mutate({ userId: u.id })}
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                  >
                    <UserPlus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#13131f] border border-white/5">
          <TabsTrigger value="all" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            All Friends ({acceptedFriends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            Requests {pendingRequests.length > 0 && <Badge variant="destructive" className="ml-1 text-[9px] h-4">{pendingRequests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {acceptedFriends.length === 0 && (
              <div className="text-center py-12 text-slate-600 col-span-full">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No friends yet. Start by searching for developers!</p>
              </div>
            )}
            {acceptedFriends.map((f) => (
              <Card key={f.id} className="bg-[#13131f] border-white/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={f.user?.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-white">
                          {f.user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#13131f] ${
                        f.user?.status === "online" ? "bg-emerald-500" : f.user?.status === "away" ? "bg-amber-500" : "bg-slate-600"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{f.user?.name || "User"}</p>
                      <p className="text-[10px] text-slate-500">@{f.user?.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-cyan-400">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-slate-500 hover:text-red-400"
                      onClick={() => removeFriend.mutate({ friendId: f.id })}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <div className="space-y-3">
            {pendingRequests.length === 0 && (
              <div className="text-center py-12 text-slate-600">
                <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending friend requests</p>
              </div>
            )}
            {pendingRequests.map((r) => (
              <Card key={r.request.id} className="bg-[#13131f] border-white/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={r.user?.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-white">
                        {r.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-white">{r.user?.name || "User"}</p>
                      <p className="text-[10px] text-slate-500">wants to be your friend</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={() => acceptRequest.mutate({ friendId: r.request.id })}
                    >
                      <Check className="w-4 h-4 mr-1" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => removeFriend.mutate({ friendId: r.request.id })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
