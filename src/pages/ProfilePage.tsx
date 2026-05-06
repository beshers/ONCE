import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  Camera,
  CheckCircle2,
  Code2,
  Download,
  FileCode2,
  FolderOpen,
  Globe2,
  Lock,
  Mail,
  MessageSquare,
  Music,
  RotateCcw,
  Rocket,
  Save,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpcClient";
import { useAuth } from "@/hooks/useAuth";
import { useProfileRingtone } from "@/hooks/useProfileRingtone";
import { getStoredProfileAvatar, getUserInitial, setStoredProfileAvatar } from "@/lib/profileAvatar";
import {
  BUILT_IN_PROFILE_RINGTONES,
  setStoredBuiltInProfileRingtone,
  setStoredProfileRingtone,
} from "@/lib/profileRingtone";
import type { BuiltInProfileRingtoneId } from "@/lib/profileRingtone";
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

const firstWelcomeKey = (userId: string) => `ocne_profile_first_welcome_${userId}`;
const onboardingSeenKey = (userId: string) => `ocne_profile_onboarding_seen_${userId}`;
const photoVisibilityKey = (userId: string) => `ocne_profile_photo_visibility_${userId}`;
const selectedPhotoFriendsKey = (userId: string) => `ocne_profile_photo_selected_friends_${userId}`;

type ProfilePhotoVisibility = "everyone" | "friends" | "selected" | "private";

const visibilityOptions: Array<{
  value: ProfilePhotoVisibility;
  label: string;
  description: string;
  icon: typeof Globe2;
}> = [
  { value: "everyone", label: "All users", description: "Your profile photo can be shown around OCNE.", icon: Globe2 },
  { value: "friends", label: "Friends", description: "Keep the photo for accepted friends.", icon: Users },
  { value: "selected", label: "Selected friends", description: "Choose exactly who should see it.", icon: UserCheck },
  { value: "private", label: "Only me", description: "Keep the photo private on this device.", icon: Lock },
];

function loadPhotoVisibility(userId?: string | null): ProfilePhotoVisibility {
  if (!userId || typeof window === "undefined") return "everyone";
  try {
    const stored = localStorage.getItem(photoVisibilityKey(userId));
    return visibilityOptions.some((option) => option.value === stored) ? (stored as ProfilePhotoVisibility) : "everyone";
  } catch {
    return "everyone";
  }
}

function loadSelectedPhotoFriends(userId?: string | null) {
  if (!userId || typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(selectedPhotoFriendsKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

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
  const [sharePhotoUrl, setSharePhotoUrl] = useState<string | null>(null);
  const [shareIncludesPhoto, setShareIncludesPhoto] = useState(false);
  const [photoVisibility, setPhotoVisibility] = useState<ProfilePhotoVisibility>(() => loadPhotoVisibility(user?.id));
  const [selectedPhotoFriendIds, setSelectedPhotoFriendIds] = useState<string[]>(() => loadSelectedPhotoFriends(user?.id));
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const initials = getUserInitial(user);
  const hasLocalPhoto = !!getStoredProfileAvatar(user?.id);
  const displayName = user?.name || user?.username || "Developer";

  const { data: stats, isLoading: statsLoading } = trpc.activity.dashboardStats.useQuery();
  const { data: activity = [] } = trpc.activity.recent.useQuery();
  const { data: projects } = trpc.project.list.useQuery();
  const { data: snippets = [] } = trpc.snippet.list.useQuery();
  const { data: friends = [] } = trpc.friend.list.useQuery(undefined, { enabled: !!user?.id });

  const showFirstWelcome = useMemo(() => {
    if (!user?.id || welcomeDismissed || typeof window === "undefined") return false;
    try {
      const firstWelcomeRequested = localStorage.getItem(firstWelcomeKey(user.id)) === "true";
      const onboardingSeen = localStorage.getItem(onboardingSeenKey(user.id)) === "true";
      const queryRequested = new URLSearchParams(window.location.search).get("welcome") === "new";
      return (firstWelcomeRequested || queryRequested) && !onboardingSeen;
    } catch {
      return false;
    }
  }, [user?.id, welcomeDismissed]);

  const recentProjects = useMemo(
    () => [...(projects?.owned || []), ...(projects?.collaborated || [])].slice(0, 6),
    [projects],
  );

  const acceptedFriends = useMemo(
    () => friends.filter((friend) => friend.status === "accepted" && friend.user?.id),
    [friends],
  );

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: async () => {
      setMessage("Profile saved.");
      setShareDialogOpen(true);
      await utils.auth.me.invalidate();
      await utils.user.me.invalidate();
      await refresh();
    },
    onError: (error) => setMessage(error.message || "Profile could not be saved."),
  });

  const shareProfileUpdate = trpc.social.createPost.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.social.feed.invalidate(), utils.social.favoriteFeed.invalidate()]);
      setShareDialogOpen(false);
      setSharePhotoUrl(null);
      setShareIncludesPhoto(false);
      toast.success("Shared to the social feed.");
    },
    onError: (error) => toast.error(error.message || "Could not share this update."),
  });

  const handleSave = () => {
    if (!user) return;
    const nextAvatarUrl = avatarUrl.trim();
    const photoChanged = !!nextAvatarUrl && nextAvatarUrl !== (user.avatar || "");
    setShareIncludesPhoto(photoChanged);
    setSharePhotoUrl(photoChanged ? nextAvatarUrl : null);
    setShareText(
      photoChanged
        ? `${user.name || user.username || "I"} updated my OCNE profile photo.`
        : `${user.name || user.username || "I"} updated my OCNE profile.`,
    );
    updateProfile.mutate({
      name: name.trim() || user.name,
      username: username.trim() || user.username,
      bio: bio.trim(),
      avatar: nextAvatarUrl,
    });
  };

  const handleSavePhotoVisibility = () => {
    if (!user?.id) return;
    try {
      localStorage.setItem(photoVisibilityKey(user.id), photoVisibility);
      localStorage.setItem(selectedPhotoFriendsKey(user.id), JSON.stringify(selectedPhotoFriendIds));
      setMessage("Profile photo visibility saved.");
    } catch {
      setMessage("The browser could not save the profile photo visibility.");
    }
  };

  const toggleSelectedPhotoFriend = (friendId: string) => {
    setSelectedPhotoFriendIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId],
    );
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
      setShareIncludesPhoto(true);
      setSharePhotoUrl(dataUrl);
      setShareText(`${user.name || user.username || "I"} updated my OCNE profile photo.`);
      setShareDialogOpen(true);
    }
  };

  const handleRemoveLocalPhoto = () => {
    if (!user) return;
    setStoredProfileAvatar(user.id, null);
    setSharePhotoUrl(null);
    setShareIncludesPhoto(false);
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

  const handleBuiltInRingtoneSelect = (id: BuiltInProfileRingtoneId) => {
    if (!user) return;
    ringtonePreviewRef.current?.pause();
    const saved = setStoredBuiltInProfileRingtone(user.id, id);
    const selected = BUILT_IN_PROFILE_RINGTONES.find((item) => item.id === id);
    setMessage(saved ? `${selected?.name || "OCNE ringtone"} selected for incoming calls.` : "The browser could not save this ringtone.");
  };

  const finishFirstWelcome = () => {
    if (!user?.id) return;
    try {
      localStorage.setItem(onboardingSeenKey(user.id), "true");
      localStorage.removeItem(firstWelcomeKey(user.id));
      if (window.location.search.includes("welcome=new")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch {
      // The animation can still close even if local storage is unavailable.
    }
    setWelcomeDismissed(true);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <style>{`
        @keyframes ocneWelcomeIn {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ocneWelcomeGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(34, 211, 238, 0); }
          50% { box-shadow: 0 0 34px rgba(34, 211, 238, 0.18); }
        }
        @keyframes ocneWelcomeStep {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="border-white/10 bg-[#10101a] text-slate-100">
          <DialogHeader>
            <DialogTitle>Share this profile update?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Post a short update to the public social feed so other developers can see what changed.
            </DialogDescription>
          </DialogHeader>
          {shareIncludesPhoto && sharePhotoUrl && (
            <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
              <img src={sharePhotoUrl} alt="New profile photo preview" className="max-h-72 w-full object-cover" />
            </div>
          )}
          <Textarea
            value={shareText}
            onChange={(event) => setShareText(event.target.value)}
            className="min-h-24 border-white/10 bg-white/5 text-slate-100"
          />
          {shareIncludesPhoto && photoVisibility !== "everyone" && (
            <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
              Your profile photo visibility is limited, but social feed posts are public. Share only if this photo can be seen by everyone.
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShareDialogOpen(false);
                setSharePhotoUrl(null);
                setShareIncludesPhoto(false);
              }}
              className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            >
              Not Now
            </Button>
            <Button
              onClick={() =>
                shareProfileUpdate.mutate({
                  content: shareText.trim(),
                  imageUrl: shareIncludesPhoto ? sharePhotoUrl || undefined : undefined,
                })
              }
              disabled={!shareText.trim() || shareProfileUpdate.isPending}
              className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            >
              {shareProfileUpdate.isPending ? "Sharing..." : "Share to Feed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showFirstWelcome ? (
        <section className="rounded-lg border border-cyan-400/25 bg-[#0b1220] p-5 text-slate-100" style={{ animation: "ocneWelcomeIn 420ms ease-out, ocneWelcomeGlow 2400ms ease-in-out infinite" }}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <Badge className="w-fit bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                First time in OCNE
              </Badge>
              <div>
                <h1 className="text-2xl font-semibold text-white">Welcome, {displayName}.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Start with your profile, then create a project, open the editor, connect your desktop agent, and invite people when you are ready to build together.
                </p>
              </div>
            </div>
            <Button onClick={finishFirstWelcome} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400 sm:w-auto">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Start
            </Button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              { icon: UserRound, title: "Complete profile", text: "Add your photo, bio, and ringtone." },
              { icon: FolderOpen, title: "Create project", text: "Open your first workspace." },
              { icon: Code2, title: "Write code", text: "Use the editor and saved versions." },
              { icon: MessageSquare, title: "Work together", text: "Chat, call, and share progress." },
            ].map((item, index) => (
              <div
                key={item.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                style={{ animation: `ocneWelcomeStep 360ms ease-out ${index * 90}ms both` }}
              >
                <item.icon className="mb-3 h-5 w-5 text-cyan-300" />
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" onClick={finishFirstWelcome} className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
              <Link to="/projects">
                <Rocket className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
            <Button asChild variant="outline" onClick={finishFirstWelcome} className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
              <Link to="/downloads">
                <Download className="mr-2 h-4 w-4" />
                Downloads
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-white/10 bg-[#10101a] px-5 py-4" style={{ animation: "ocneWelcomeIn 360ms ease-out" }}>
          <p className="text-lg font-semibold text-white">Welcome back, {displayName}.</p>
        </section>
      )}

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
                <UserCheck className="h-5 w-5 text-cyan-300" />
                Profile Photo Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {visibilityOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = photoVisibility === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPhotoVisibility(option.value)}
                      className={`rounded-lg border p-4 text-left transition ${
                        selected
                          ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-cyan-300" />
                        <span className="text-sm font-medium">{option.label}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{option.description}</p>
                    </button>
                  );
                })}
              </div>

              {photoVisibility === "selected" && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">Selected friends</p>
                    <span className="text-xs text-slate-500">{selectedPhotoFriendIds.length} selected</span>
                  </div>
                  <div className="grid max-h-72 gap-2 overflow-auto sm:grid-cols-2">
                    {acceptedFriends.map((friend) => (
                      <button
                        key={friend.user!.id}
                        type="button"
                        onClick={() => toggleSelectedPhotoFriend(friend.user!.id)}
                        className={`flex items-center gap-3 rounded-lg border p-2 text-left transition ${
                          selectedPhotoFriendIds.includes(friend.user!.id)
                            ? "border-cyan-400/60 bg-cyan-400/10"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                        }`}
                      >
                        <UserAvatar user={friend.user} className="h-8 w-8" fallbackClassName="bg-gradient-to-br from-cyan-500 to-violet-600 text-xs font-semibold text-white" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-slate-100">{friend.user?.name || friend.user?.username || "Friend"}</span>
                          <span className="block truncate text-xs text-slate-500">@{friend.user?.username || "developer"}</span>
                        </span>
                      </button>
                    ))}
                    {acceptedFriends.length === 0 && (
                      <p className="text-sm text-slate-500">Add accepted friends first, then choose who can see the photo.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  When you change your photo, OCNE will ask before sharing it to the social feed. Feed posts are public.
                </p>
                <Button onClick={handleSavePhotoVisibility} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  <Save className="mr-2 h-4 w-4" />
                  Save Visibility
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
                    <p className="text-sm font-medium text-white">{ringtone.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ringtone.isCustom ? "Your custom incoming-call sound on this device." : "Default OCNE incoming-call music."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => void handlePreviewRingtone()} className="border border-white/10 text-slate-200 hover:bg-white/10">
                      <Volume2 className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button onClick={() => ringtoneInputRef.current?.click()} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                      <Music className="mr-2 h-4 w-4" />
                      Choose Sound
                    </Button>
                    {ringtone.isCustom && (
                      <Button variant="outline" onClick={handleRemoveRingtone} className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                        Default
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {BUILT_IN_PROFILE_RINGTONES.map((item) => {
                  const selected = ringtone.selectedBuiltInId === item.id && !ringtone.isCustom;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleBuiltInRingtoneSelect(item.id)}
                      className={`rounded-lg border p-3 text-left transition ${
                        selected
                          ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="block text-sm font-medium">{item.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">Built-in OCNE ringtone</span>
                    </button>
                  );
                })}
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
