export const PROFILE_AVATAR_UPDATED_EVENT = "ocne-profile-avatar-updated";

const avatarKey = (userId: string) => `ocne_profile_avatar_${userId}`;

export function getStoredProfileAvatar(userId?: string | null) {
  if (!userId || typeof window === "undefined") return null;

  try {
    return localStorage.getItem(avatarKey(userId));
  } catch {
    return null;
  }
}

export function setStoredProfileAvatar(userId: string, value: string | null) {
  try {
    if (value) {
      localStorage.setItem(avatarKey(userId), value);
    } else {
      localStorage.removeItem(avatarKey(userId));
    }
    window.dispatchEvent(new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, { detail: { userId } }));
    return true;
  } catch {
    return false;
  }
}

export function getUserInitial(user?: { name?: string | null; username?: string | null; email?: string | null } | null) {
  const source = user?.name || user?.username || user?.email || "User";
  return source.trim().charAt(0).toUpperCase() || "U";
}
