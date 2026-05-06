import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Code2,
  Copy,
  Filter,
  Globe,
  Heart,
  MessageCircle,
  Search,
  Send,
  Share2,
  Sparkles,
  Star,
} from "lucide-react";
import { trpc } from "@/lib/trpcClient";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SocialPage() {
  const { user } = useAuth();
  const [newPost, setNewPost] = useState("");
  const [newCode, setNewCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [commentText, setCommentText] = useState("");
  const [activePost, setActivePost] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [feedMode, setFeedMode] = useState<"all" | "favorites" | "code" | "mine">("all");
  const utils = trpc.useUtils();

  const { data: feed = [], isLoading } = trpc.social.feed.useQuery();
  const { data: favoriteFeed = [], isLoading: favoritesLoading } = trpc.social.favoriteFeed.useQuery();
  const { data: comments = [], isLoading: commentsLoading } = trpc.social.comments.useQuery(
    { postId: activePost || 0 },
    { enabled: !!activePost },
  );

  const filteredFeed = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sourceFeed = feedMode === "favorites" ? favoriteFeed : feed;
    return sourceFeed.filter((item) => {
      const matchesMode =
        feedMode === "all" ||
        feedMode === "favorites" ||
        (feedMode === "code" && !!item.post.codeSnippet) ||
        (feedMode === "mine" && item.author?.id === user?.id);
      const searchable = `${item.post.content} ${item.post.language || ""} ${item.author?.name || ""} ${item.author?.username || ""}`.toLowerCase();
      return matchesMode && (!query || searchable.includes(query));
    });
  }, [favoriteFeed, feed, feedMode, search, user?.id]);

  const createPost = trpc.social.createPost.useMutation({
    onSuccess: async () => {
      await utils.social.feed.invalidate();
      setNewPost("");
      setNewCode("");
      toast.success("Posted to the social feed.");
    },
    onError: (error) => toast.error(error.message || "Post could not be created."),
  });

  const likePost = trpc.social.likePost.useMutation({
    onSuccess: () => utils.social.feed.invalidate(),
    onError: (error) => toast.error(error.message || "Could not like this post."),
  });

  const sharePost = trpc.social.sharePost.useMutation({
    onSuccess: () => utils.social.feed.invalidate(),
  });

  const addComment = trpc.social.addComment.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.social.feed.invalidate(),
        activePost ? utils.social.comments.invalidate({ postId: activePost }) : Promise.resolve(),
      ]);
      setCommentText("");
    },
    onError: (error) => toast.error(error.message || "Comment could not be added."),
  });

  const handleCreatePost = () => {
    createPost.mutate({
      content: newPost.trim(),
      codeSnippet: newCode.trim() || undefined,
      language: newCode.trim() ? language : undefined,
    });
  };

  const handleShare = async (postId: number) => {
    const url = `${window.location.origin}/social?post=${postId}`;
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    sharePost.mutate({ postId });
    toast.success("Post link copied.");
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Social Feed</h1>
            <p className="text-sm text-slate-400">Share progress, code ideas, profile updates, and questions with OCNE developers.</p>
          </div>
          <Badge className="w-fit bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/10">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Live community
          </Badge>
        </div>

        <Card className="rounded-lg border-white/10 bg-[#10101a]">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <UserAvatar user={user} className="h-10 w-10" fallbackClassName="bg-gradient-to-br from-cyan-500 to-violet-600 text-sm font-semibold text-white" />
              <div className="min-w-0 flex-1 space-y-3">
                <Textarea
                  value={newPost}
                  onChange={(event) => setNewPost(event.target.value)}
                  placeholder="Share what you built, changed, fixed, or learned..."
                  className="min-h-24 resize-none border-white/10 bg-white/5 text-sm text-white"
                />
                {newCode && (
                  <div className="rounded-lg border border-white/10 bg-[#0b0b12] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="h-8 border-white/10 bg-white/5 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#10101a] text-slate-200">
                          <SelectItem value="typescript">TypeScript</SelectItem>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                          <SelectItem value="csharp">C#</SelectItem>
                          <SelectItem value="html">HTML</SelectItem>
                          <SelectItem value="css">CSS</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => setNewCode("")} className="text-slate-400 hover:text-slate-100">
                        Remove
                      </Button>
                    </div>
                    <Textarea
                      value={newCode}
                      onChange={(event) => setNewCode(event.target.value)}
                      className="min-h-32 resize-y border-white/10 bg-black/20 font-mono text-xs text-slate-200"
                    />
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-cyan-300"
                    onClick={() => setNewCode("// Add your code snippet here\n")}
                  >
                    <Code2 className="mr-2 h-4 w-4" />
                    Add Code
                  </Button>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPost.trim() || createPost.isPending}
                    className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {createPost.isPending ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#10101a] p-3 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3">
            <Search className="h-4 w-4 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search posts, code, or people..."
              className="border-0 bg-transparent px-0 text-slate-100 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            {(["all", "favorites", "code", "mine"] as const).map((mode) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                onClick={() => setFeedMode(mode)}
                className={feedMode === mode ? "bg-cyan-500/10 text-cyan-300" : "text-slate-400 hover:text-slate-100"}
              >
                {mode === "all" ? "All" : mode === "favorites" ? "Favorites" : mode === "code" ? "Code" : "Mine"}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {(isLoading || (feedMode === "favorites" && favoritesLoading)) && (
            <div className="rounded-lg border border-white/10 bg-[#10101a] p-8 text-center text-sm text-slate-500">
              Loading feed...
            </div>
          )}

          {!isLoading && !(feedMode === "favorites" && favoritesLoading) && filteredFeed.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-[#10101a] py-16 text-center text-slate-500">
              {feedMode === "favorites" ? (
                <Star className="mx-auto mb-3 h-10 w-10 opacity-30" />
              ) : (
                <Globe className="mx-auto mb-3 h-10 w-10 opacity-30" />
              )}
              <p className="text-lg font-medium text-slate-300">
                {feedMode === "favorites" ? "No favorite posts yet" : "No posts found"}
              </p>
              <p className="text-sm">
                {feedMode === "favorites"
                  ? "Mark friends as favorite on the Friends page to follow their posts here."
                  : "Share something or clear the current filter."}
              </p>
            </div>
          )}

          {filteredFeed.map((item) => (
            <Card key={item.post.id} className="rounded-lg border-white/10 bg-[#10101a]">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={item.author} className="h-9 w-9" fallbackClassName="bg-gradient-to-br from-cyan-500 to-violet-600 text-sm font-semibold text-white" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{item.author?.name || item.author?.username || "User"}</p>
                      <p className="text-xs text-slate-500">@{item.author?.username || "developer"} · {formatTime(item.post.createdAt)}</p>
                    </div>
                  </div>
                  {item.post.codeSnippet && (
                    <Badge variant="outline" className="border-cyan-400/20 text-cyan-300">
                      {item.post.language || "code"}
                    </Badge>
                  )}
                </div>

                <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.post.content}</p>

                {item.post.codeSnippet && (
                  <div className="mb-3 rounded-lg border border-white/10 bg-[#0b0b12]">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                      <span className="text-xs text-slate-500">{item.post.language || "code"}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard?.writeText(item.post.codeSnippet || "");
                          toast.success("Code copied.");
                        }}
                        className="h-7 text-slate-400 hover:text-slate-100"
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                    <pre className="max-h-80 overflow-auto p-3 font-mono text-xs leading-5 text-slate-300">
                      <code>{item.post.codeSnippet}</code>
                    </pre>
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-white/10 pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => likePost.mutate({ postId: item.post.id })}
                    className="text-slate-400 hover:text-red-300"
                  >
                    <Heart className="mr-1.5 h-4 w-4" />
                    {item.post.likes}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePost(activePost === item.post.id ? null : item.post.id)}
                    className="text-slate-400 hover:text-cyan-300"
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    {item.post.comments}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleShare(item.post.id)}
                    className="text-slate-400 hover:text-cyan-300"
                  >
                    <Share2 className="mr-1.5 h-4 w-4" />
                    {item.post.shares}
                  </Button>
                </div>

                {activePost === item.post.id && (
                  <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                    <div className="flex gap-2">
                      <Input
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        placeholder="Write a comment..."
                        className="border-white/10 bg-white/5 text-sm text-white"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && commentText.trim()) {
                            addComment.mutate({ postId: item.post.id, content: commentText.trim() });
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => addComment.mutate({ postId: item.post.id, content: commentText.trim() })}
                        disabled={!commentText.trim() || addComment.isPending}
                        className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {commentsLoading && <p className="text-sm text-slate-500">Loading comments...</p>}
                    {comments.map((comment) => (
                      <div key={comment.comment.id} className="flex gap-2 rounded-lg bg-white/[0.03] p-3">
                        <UserAvatar user={comment.author} className="h-7 w-7" fallbackClassName="bg-gradient-to-br from-cyan-500 to-violet-600 text-sm font-semibold text-white" />
                        <div>
                          <p className="text-xs font-medium text-slate-200">{comment.author?.name || comment.author?.username || "User"}</p>
                          <p className="mt-1 text-sm text-slate-400">{comment.comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:h-fit">
        <Card className="rounded-lg border-white/10 bg-[#10101a]">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Community Pulse</p>
              <p className="text-xs text-slate-500">A quick view of what is moving today.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-2xl font-semibold text-white">{feed.length}</p>
                <p className="text-xs text-slate-500">Posts</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-2xl font-semibold text-white">{feed.filter((item) => item.post.codeSnippet).length}</p>
                <p className="text-xs text-slate-500">Code shares</p>
              </div>
            </div>
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
              Profile updates can now be shared directly from the profile page after saving.
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
