import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell, Check, Trash2, UserPlus, FolderOpen, MessageSquare,
  Trophy, Code2, CheckCheck
} from "lucide-react";

export default function NotificationsPage() {
  const utils = trpc.useUtils();

  const { data: notifications } = trpc.notification.list.useQuery();
  const { data: unread } = trpc.notification.unread.useQuery();
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unread.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unread.invalidate();
      utils.notification.unreadCount.invalidate();
      toast.success("All notifications marked as read");
    },
  });
  const deleteNotif = trpc.notification.delete.useMutation({
    onSuccess: () => utils.notification.list.invalidate(),
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "friend_request": return <UserPlus className="w-4 h-4 text-cyan-400" />;
      case "friend_accepted": return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case "project_invite": return <FolderOpen className="w-4 h-4 text-violet-400" />;
      case "project_update": return <FolderOpen className="w-4 h-4 text-amber-400" />;
      case "code_review": return <Code2 className="w-4 h-4 text-sky-400" />;
      case "mention": return <MessageSquare className="w-4 h-4 text-pink-400" />;
      case "badge_earned": return <Trophy className="w-4 h-4 text-amber-400" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const allNotifications = (notifications || []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 text-sm">
            {unread?.length || 0} unread notification{(unread?.length || 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllRead.mutate()}
          className="text-cyan-400 hover:text-cyan-300"
        >
          <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-2">
          {allNotifications.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          )}
          {allNotifications.map((n) => (
            <Card
              key={n.notification.id}
              className={`bg-[#13131f] border-white/5 hover:border-white/10 transition-all ${
                !n.notification.isRead ? "border-l-2 border-l-cyan-500" : ""
              }`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(n.notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-medium ${!n.notification.isRead ? "text-white" : "text-slate-400"}`}>
                      {n.notification.title}
                    </p>
                    {!n.notification.isRead && (
                      <Badge variant="default" className="bg-cyan-500/20 text-cyan-400 text-[9px] h-4 border-0">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{n.notification.content}</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    {new Date(n.notification.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.notification.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-slate-500 hover:text-cyan-400"
                      onClick={() => markRead.mutate({ id: n.notification.id })}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-slate-500 hover:text-red-400"
                    onClick={() => deleteNotif.mutate({ id: n.notification.id })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
