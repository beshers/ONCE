import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { trpc } from "@/lib/trpcClient";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  Clock,
  MessageSquare,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type FriendStatus = "accepted" | "pending" | "blocked";

function statusDot(status?: string | null) {
  if (status === "online") return "bg-emerald-500";
  if (status === "away") return "bg-amber-500";
  return "bg-slate-600";
}

function relationLabel(status?: FriendStatus, incoming?: boolean) {
  if (status === "accepted") return "Friend";
  if (status === "pending") return incoming ? "Sent you a request" : "Request sent";
  if (status === "blocked") return "Blocked";
  return "Developer";
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("all");
  const utils = trpc.useUtils();
  const normalizedSearch = searchQuery.trim();

  const { data: friends = [], isLoading: friendsLoading } = trpc.friend.list.useQuery();
  const { data: requests = [], isLoading: requestsLoading } = trpc.friend.requests.useQuery();
  const { data: searchResults = [], isFetching: searchLoading } = trpc.friend.searchUsers.useQuery(
    { query: normalizedSearch },
    { enabled: normalizedSearch.length >= 2 },
  );

  const relationByUserId = useMemo(() => {
    const map = new Map<string, { id: number; status: FriendStatus; incoming: boolean }>();
    friends.forEach((friend) => {
      if (!friend.user?.id) return;
      map.set(String(friend.user.id), {
        id: friend.id,
        status: friend.status as FriendStatus,
        incoming: String(friend.addresseeId) !== String(friend.user.id),
      });
    });
    return map;
  }, [friends]);

  const acceptedFriends = friends.filter((friend) => friend.status === "accepted");
  const pendingRequests = requests.filter((request) => request.request.status === "pending");
  const outgoingPending = friends.filter((friend) => friend.status === "pending" && !relationByUserId.get(String(friend.user?.id))?.incoming);

  const sendRequest = trpc.friend.sendRequest.useMutation({
    onSuccess: async (result) => {
      toast.success(result.status === "accepted" ? "You are friends now." : "Friend request sent.");
      await utils.friend.list.invalidate();
      await utils.friend.requests.invalidate();
      await utils.friend.searchUsers.invalidate();
      await utils.chat.directThreads.invalidate();
    },
    onError: (error) => toast.error(error.message || "Could not send the friend request."),
  });

  const acceptRequest = trpc.friend.accept.useMutation({
    onSuccess: async () => {
      toast.success("Friend request accepted.");
      await utils.friend.list.invalidate();
      await utils.friend.requests.invalidate();
      await utils.chat.directThreads.invalidate();
      setTab("all");
    },
    onError: (error) => toast.error(error.message || "Could not accept this request."),
  });

  const removeFriend = trpc.friend.remove.useMutation({
    onSuccess: async () => {
      toast.success("Friend connection updated.");
      await utils.friend.list.invalidate();
      await utils.friend.requests.invalidate();
      await utils.friend.searchUsers.invalidate();
      await utils.chat.directThreads.invalidate();
    },
    onError: (error) => toast.error(error.message || "Could not update this friend connection."),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#10101a] p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge className="mb-3 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/10">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Developer network
          </Badge>
          <h1 className="text-2xl font-bold text-white">Friends</h1>
          <p className="mt-1 text-sm text-slate-400">Find the right person by photo, name, and username before sending a request.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[320px]">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-lg font-semibold text-white">{acceptedFriends.length}</p>
            <p className="text-xs text-slate-500">Friends</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-lg font-semibold text-white">{pendingRequests.length}</p>
            <p className="text-xs text-slate-500">Requests</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-lg font-semibold text-white">{outgoingPending.length}</p>
            <p className="text-xs text-slate-500">Sent</p>
          </div>
        </div>
      </section>

      <Card className="border-white/10 bg-[#10101a]">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or username..."
              className="h-12 border-white/10 bg-white/5 pl-10 text-white"
            />
          </div>

          {normalizedSearch.length > 0 && normalizedSearch.length < 2 && (
            <p className="mt-3 text-xs text-slate-500">Type at least 2 letters to search developers.</p>
          )}

          {normalizedSearch.length >= 2 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {searchLoading && (
                <div className="col-span-full rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                  Searching developers...
                </div>
              )}
              {!searchLoading && searchResults.length === 0 && (
                <div className="col-span-full rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center">
                  <UserPlus className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-400">No users found for "{normalizedSearch}".</p>
                </div>
              )}
              {searchResults.map((user) => {
                const relation = relationByUserId.get(String(user.id));
                const isPending = relation?.status === "pending";
                const isAccepted = relation?.status === "accepted";
                const canAdd = !relation || relation.status === "blocked";

                return (
                  <div key={user.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative shrink-0">
                        <UserAvatar user={user} className="h-12 w-12" fallbackClassName="bg-gradient-to-br from-cyan-500 to-violet-600 text-white" />
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#10101a] ${statusDot(user.status)}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{user.name || user.username}</p>
                        <p className="truncate text-xs text-slate-500">@{user.username}</p>
                        <p className="mt-1 text-xs text-cyan-300">{relationLabel(relation?.status, relation?.incoming)}</p>
                      </div>
                    </div>
                    {isAccepted ? (
                      <Button size="sm" variant="outline" onClick={() => navigate("/chat")} className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Chat
                      </Button>
                    ) : isPending ? (
                      <Button size="sm" disabled className="bg-white/5 text-slate-500">
                        <Clock className="mr-2 h-4 w-4" />
                        Pending
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => sendRequest.mutate({ userId: user.id })}
                        disabled={!canAdd || sendRequest.isPending}
                        className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Friend
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 border border-white/10 bg-[#10101a] p-1 sm:w-fit">
          <TabsTrigger value="all" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300">
            All Friends ({acceptedFriends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300">
            Requests
            {pendingRequests.length > 0 && <Badge className="ml-2 h-5 bg-red-500 px-1.5 text-[10px] text-white">{pendingRequests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {friendsLoading && (
              <div className="col-span-full rounded-lg border border-white/10 bg-[#10101a] p-6 text-sm text-slate-400">Loading friends...</div>
            )}
            {!friendsLoading && acceptedFriends.length === 0 && (
              <div className="col-span-full rounded-lg border border-white/10 bg-[#10101a] py-12 text-center text-slate-500">
                <Users className="mx-auto mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">No friends yet. Search above and choose the right developer by profile photo.</p>
              </div>
            )}
            {acceptedFriends.map((friend) => (
              <Card key={friend.id} className="border-white/10 bg-[#10101a]">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      <UserAvatar user={friend.user} className="h-11 w-11" fallbackClassName="bg-gradient-to-br from-cyan-500 to-violet-600 text-white" />
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#10101a] ${statusDot(friend.user?.status)}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{friend.user?.name || friend.user?.username || "User"}</p>
                      <p className="truncate text-xs text-slate-500">@{friend.user?.username || "developer"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-cyan-300" onClick={() => navigate("/chat")}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-red-300"
                      onClick={() => removeFriend.mutate({ friendId: friend.id })}
                      disabled={removeFriend.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <div className="space-y-3">
            {requestsLoading && (
              <div className="rounded-lg border border-white/10 bg-[#10101a] p-6 text-sm text-slate-400">Loading requests...</div>
            )}
            {!requestsLoading && pendingRequests.length === 0 && (
              <div className="rounded-lg border border-white/10 bg-[#10101a] py-12 text-center text-slate-500">
                <UserCheck className="mx-auto mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">No pending friend requests.</p>
              </div>
            )}
            {pendingRequests.map((request) => (
              <Card key={request.request.id} className="border-white/10 bg-[#10101a]">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={request.user} className="h-12 w-12" fallbackClassName="bg-gradient-to-br from-cyan-500 to-violet-600 text-white" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{request.user?.name || request.user?.username || "User"}</p>
                      <p className="truncate text-xs text-slate-500">@{request.user?.username || "developer"}</p>
                      <p className="mt-1 text-xs text-cyan-300">Wants to be your friend</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                      onClick={() => acceptRequest.mutate({ friendId: request.request.id })}
                      disabled={acceptRequest.isPending}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 bg-white/5 text-red-300 hover:bg-red-500/10"
                      onClick={() => removeFriend.mutate({ friendId: request.request.id })}
                      disabled={removeFriend.isPending}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Decline
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
