import { useState } from "react";
import { trpc } from "@/lib/trpcClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Globe, Heart, MessageCircle, Share2, Code2, Send
} from "lucide-react";

export default function SocialPage() {
  const { user } = useAuth();
  const [newPost, setNewPost] = useState("");
  const [newCode, setNewCode] = useState("");
  const [commentText, setCommentText] = useState("");
  const [activePost, setActivePost] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: feed } = trpc.social.feed.useQuery();
  const createPost = trpc.social.createPost.useMutation({
    onSuccess: () => {
      utils.social.feed.invalidate();
      setNewPost("");
      setNewCode("");
      toast.success("Posted!");
    },
  });
  const likePost = trpc.social.likePost.useMutation({
    onSuccess: () => utils.social.feed.invalidate(),
  });
  const addComment = trpc.social.addComment.useMutation({
    onSuccess: () => {
      utils.social.feed.invalidate();
      setCommentText("");
      setActivePost(null);
    },
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Social Feed</h1>
        <p className="text-slate-400 text-sm">Share your code and connect with developers</p>
      </div>

      {/* Create Post */}
      <Card className="bg-[#13131f] border-white/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-white text-sm">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind? Share code, ideas, or questions..."
                className="bg-white/5 border-white/10 text-white text-sm min-h-[80px] resize-none"
              />
              {newCode && (
                <div className="bg-[#0d0d12] rounded-lg p-3">
                  <pre className="text-xs text-slate-400 font-mono">{newCode}</pre>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-cyan-400 text-xs"
                  onClick={() => setNewCode(newCode ? "" : "// Add your code snippet here\n")}
                >
                  <Code2 className="w-3.5 h-3.5 mr-1" /> {newCode ? "Remove Code" : "Add Code"}
                </Button>
                <Button
                  onClick={() => createPost.mutate({ content: newPost, codeSnippet: newCode || undefined })}
                  disabled={!newPost.trim() || createPost.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-sm"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      <div className="space-y-4">
        {(feed || []).length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-sm">Be the first to share something!</p>
          </div>
        )}
        {(feed || []).map((item) => (
          <Card key={item.post.id} className="bg-[#13131f] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={item.author?.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-white text-xs">
                    {item.author?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-white">{item.author?.name || "User"}</p>
                  <p className="text-[10px] text-slate-500">{new Date(item.post.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-3">{item.post.content}</p>
              {item.post.codeSnippet && (
                <div className="bg-[#0d0d12] rounded-lg p-3 mb-3 border border-white/5">
                  <Badge variant="outline" className="border-white/10 text-slate-500 text-[9px] h-4 mb-2">
                    {item.post.language || "code"}
                  </Badge>
                  <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{item.post.codeSnippet}</pre>
                </div>
              )}
              <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                <button
                  onClick={() => likePost.mutate({ postId: item.post.id })}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5" /> {item.post.likes}
                </button>
                <button
                  onClick={() => setActivePost(activePost === item.post.id ? null : item.post.id)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> {item.post.comments}
                </button>
                <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                  <Share2 className="w-3.5 h-3.5" /> {item.post.shares}
                </button>
              </div>
              {activePost === item.post.id && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="flex gap-2">
                    <Input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="bg-white/5 border-white/10 text-white text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && commentText.trim()) {
                          addComment.mutate({ postId: item.post.id, content: commentText });
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => addComment.mutate({ postId: item.post.id, content: commentText })}
                      disabled={!commentText.trim()}
                      className="bg-cyan-600 text-white"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
