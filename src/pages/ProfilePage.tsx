import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  Camera,
  Code2,
  FileCode2,
  FolderOpen,
  Mail,
  Music,
  RotateCcw,
  Save,
  UserRound,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpcClient";
import { useAuth } from "@/hooks/useAuth";
import { useProfileRingtone } from "@/hooks/useProfileRingtone";
import { getStoredProfileAvatar, getUserInitial, setStoredProfileAvatar } from "@/lib/profileAvatar";
import { setStoredProfileRingtone } from "@/lib/profileRingtone";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const MAX_LOCAL_AVATAR_BYTES = 1024 * 1024;
const MAX_RINGTONE_BYTES = 3 * 1024 * 1024;

function formatDate(value?: Date | string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ringtoneInputRef = useRef<HTMLInputElement | null>(null);
  const ringtonePreviewRef = useRef<HTMLAudioElement | null>(null);
  const ringtone = useProfileRingtone(user?.id);
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [message, setMessage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [ringtoneError, setRingtoneError] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareText, setShareText] = useState("");

  const initials = getUserInitial(user);
  const hasLocalPhoto = !!getStoredProfileAvatar(user?.id);

  const { data: stats, isLoading: statsLoading } = trpc.activity.dashboardStats.useQuery();
  const { data: activity = [] } = trpc.activity.recent.useQuery();
  const { data: projects } = trpc.project.list.useQuery();
  const { data: snippets = [] } = trpc.snippet.list.useQuery();

  const recentProjects = useMemo(
    () => [...(projects?.owned || []), ...(projects?.collaborated || [])].slice(0, 6),
    [projects],
  );

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: async () => {
      setMessage("Profile saved.");
      setShareText(`${user?.name || user?.username || "I"} updated my OCNE profile.`);
      setShareDialogOpen(true);
      await utils.auth.me.invalidate();
      await utils.user.me.invalidate();
      await refresh();
    },
    onError: (error) => setMessage(error.message || "Profile could not be saved."),
  });

  const shareProfileUpdate = trpc.social.createPost.useMutation({
    onSuccess: async () => {
      await utils.social.feed.invalidate();
      setShareDialogOpen(false);
      toast.success("Shared to the social feed.");
    },
    onError: (error) => toast.error(error.message || "Could not share this update."),
  });

  const handleSave = () => {
    if (!user) return;
    updateProfile.mutate({
      name: name.trim() || user.name,
      username: username.trim() || user.username,
      bio: bio.trim(),
      avatar: avatarUrl.trim(),
    });
  };

  const handlePhotoChange = async (file?: File) => {
    if (!user || !file) return;
    setPhotoError(null);
    setMessage(null);

    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file.");
      return;
    }

    if (file.size > MAX_LOCAL_AVATAR_BYTES) {
      setPhotoError("Use an image smaller than 1 MB.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const saved = setStoredProfileAvatar(user.id, dataUrl);
    setMessage(saved ? "Profile photo updated on this device." : "The browser could not save this photo.");
    if (saved) {
      setShareText(`${user.name || user.username || "I"} updated my OCNE profile photo.`);
      setShareDialogOpen(true);
    }
  };

  const handleRemoveLocalPhoto = () => {
    if (!user) return;
    setStoredProfileAvatar(user.id, null);
    setMessage("Local profile photo removed.");
  };

  const handleRingtoneChange = async (file?: File) => {
    if (!user || !file) return;
    setRingtoneError(null);
    setMessage(null);

    if (!file.type.startsWith("audio/")) {
      setRingtoneError("Choose an audio file.");
      return;
    }

    if (file.size > MAX_RINGTONE_BYTES) {
      setRingtoneError("Use an audio file smaller than 3 MB.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const saved = setStoredProfileRingtone(user.id, dataUrl, file.name);
    setMessage(saved ? "Incoming call ringtone updated." : "The browser could not save this ringtone.");
  };

  const handlePreviewRingtone = async () => {
    if (!ringtone.url) return;
    ringtonePreviewRef.current?.pause();
    ringtonePreviewRef.current = new Audio(ringtone.url);
    ringtonePreviewRef.current.volume = 0.8;
    await ringtonePreviewRef.current.play().catch(() => {
      setRingtoneError("Browser blocked the ringtone preview. Try again after clicking the page.");
    });
  };

  const handleRemoveRingtone = () => {
    if (!user) return;
    ringtonePreviewRef.current?.pause();
    setStoredProfileRingtone(user.id, null);
    setMessage("Custom ringtone removed.");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="border-white/10 bg-[#10101a] text-slate-100">
          <DialogHeader>
            <DialogTitle>Share this profile update?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Post a short update to the social feed so other developers can see what changed.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={shareText}
            onChange={(event) => setShareText(event.target.value)}
            className="min-h-24 border-white/10 bg-white/5 text-slate-100"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)} className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
              Not Now
            </Button>
            <Button
              onClick={() => shareProfileUpdate.mutate({ content: shareText.trim() })}
              disabled={!shareText.trim() || shareProfileUpdate.isPending}
              className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            >
              {shareProfileUpdate.isPending ? "Sharing..." : "Share to Feed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-[#10101a]">
        <div className="h-28 bg-gradient-to-r from-cyan-500/30 via-slate-700/40 to-violet-500/30" />
        <div className="flex flex-col gap-5 px-5 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            <UserAvatar user={user} fallback={initials} className="h-24 w-24 border-4 border-[#10101a] ring-2 ring-cyan-400/40" fallbackClassName="bg-gradient-to-br from-cyan-500 to-violet-600 text-4xl font-semibold text-white" />
            <div className="space-y-2 pb-1">
              <div>
                <h1 className="text-2xl font-semibold text-white">{user?.name || user?.username || "Profile"}</h1>
                <p className="text-sm text-slate-400">@{user?.username || "developer"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/10">Online</Badge>
                <Badge className="bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/10">
                  Joined {formatDate(user?.createdAt)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handlePhotoChange(event.target.files?.[0])}
            />
            <Button onClick={() => fileInputRef.current?.click()} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Camera className="mr-2 h-4 w-4" />
              Change Photo
            </Button>
            {hasLocalPhoto && (
              <Button variant="outline" onClick={handleRemoveLocalPhoto} className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                <RotateCcw className="mr-2 h-4 w-4" />
                Use Default
              </Button>
            )}
          </div>
        </div>
      </section>

      {(message || photoError || ringtoneError) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${photoError || ringtoneError ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>
          {photoError || ringtoneError || message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="rounded-lg border-white/10 bg-[#10101a] text-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-5 w-5 text-cyan-300" />
                Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  Display name
                  <Input value={name} onChange={(event) => setName(event.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  Username
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
                </label>
              </div>
              <label className="space-y-2 text-sm text-slate-300">
                Profile photo URL
                <Input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." className="border-white/10 bg-white/5 text-slate-100" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                Bio
                <Textarea value={bio} onChange={(event) => setBio(event.target.value)} className="min-h-28 border-white/10 bg-white/5 text-slate-100" />
              </label>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateProfile.isPending} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfile.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-white/10 bg-[#10101a] text-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Music className="h-5 w-5 text-cyan-300" />
                Incoming Call Ringtone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={ringtoneInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(event) => void handleRingtoneChange(event.target.files?.[0])}
              />
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{ringtone.name || "Default OCNE ringtone"}</p>
                    <p className="mt-1 text-xs text-slate-500">Used when someone calls you in OCNE Chat on this device.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ringtone.url && (
                      <Button variant="ghost" onClick={() => void handlePreviewRingtone()} className="border border-white/10 text-slate-200 hover:bg-white/10">
                        <Volume2 className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                    )}
                    <Button onClick={() => ringtoneInputRef.current?.click()} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                      <Music className="mr-2 h-4 w-4" />
                      Choose Sound
                    </Button>
                    {ringtone.url && (
                      <Button variant="outline" onClick={handleRemoveRingtone} className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                        Default
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-white/10 bg-[#10101a] text-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-cyan-300" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.length > 0 ? (
                activity.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-sm text-slate-200">{item.action}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.entityType || "workspace"} · {formatDate(item.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No activity has been recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="rounded-lg border-white/10 bg-[#10101a] text-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Everything You Made</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <FolderOpen className="mb-3 h-5 w-5 text-cyan-300" />
                <p className="text-2xl font-semibold text-white">{statsLoading ? "..." : stats?.projects ?? 0}</p>
                <p className="text-xs text-slate-500">Projects</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <FileCode2 className="mb-3 h-5 w-5 text-violet-300" />
                <p className="text-2xl font-semibold text-white">{statsLoading ? "..." : stats?.snippets ?? 0}</p>
                <p className="text-xs text-slate-500">Snippets</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <Code2 className="mb-3 h-5 w-5 text-emerald-300" />
                <p className="text-2xl font-semibold text-white">{statsLoading ? "..." : stats?.collaborating ?? 0}</p>
                <p className="text-xs text-slate-500">Collaborations</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <Mail className="mb-3 h-5 w-5 text-amber-300" />
                <p className="text-2xl font-semibold text-white">{statsLoading ? "..." : stats?.messagesThisMonth ?? 0}</p>
                <p className="text-xs text-slate-500">Messages</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-white/10 bg-[#10101a] text-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <Link key={`${project.id}-${project.name}`} to={`/projects/${project.id}`} className="block rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-cyan-400/40">
                    <p className="truncate text-sm font-medium text-slate-100">{project.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{project.language || "project"} · {formatDate(project.updatedAt)}</p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500">No projects yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-white/10 bg-[#10101a] text-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Recent Snippets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {snippets.slice(0, 5).map((snippet) => (
                <div key={snippet.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="truncate text-sm font-medium text-slate-100">{snippet.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{snippet.language || "code"} · {formatDate(snippet.createdAt)}</p>
                </div>
              ))}
              {snippets.length === 0 && <p className="text-sm text-slate-500">No snippets yet.</p>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
