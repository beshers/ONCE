import { useAuth } from "@/hooks/useAuth";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { getUserInitial } from "@/lib/profileAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type AvatarUser = {
  id?: string | number | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar?: string | null;
};

export function UserAvatar({
  user,
  fallback,
  className,
  imageClassName = "object-cover",
  fallbackClassName = "bg-gradient-to-br from-cyan-500 to-violet-600 text-white",
}: {
  user?: AvatarUser | null;
  fallback?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const { user: currentUser } = useAuth();
  const currentAvatar = useProfileAvatar(currentUser);
  const isCurrentUser =
    !!user?.id && !!currentUser?.id && String(user.id) === String(currentUser.id);
  const src = isCurrentUser ? currentAvatar : user?.avatar;
  const initial =
    fallback?.trim().charAt(0).toUpperCase() ||
    getUserInitial({
      name: user?.name,
      username: user?.username,
      email: user?.email,
    });

  return (
    <Avatar className={className}>
      <AvatarImage src={src || undefined} className={imageClassName} />
      <AvatarFallback className={fallbackClassName}>{initial}</AvatarFallback>
    </Avatar>
  );
}
