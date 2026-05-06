import { useMemo, useSyncExternalStore } from "react";
import { getStoredProfileAvatar, PROFILE_AVATAR_UPDATED_EVENT } from "@/lib/profileAvatar";

export function useProfileAvatar(user?: { id?: string | null; avatar?: string | null } | null) {
  const userId = user?.id ?? null;

  const localAvatar = useSyncExternalStore(
    (onStoreChange) => {
      const handleAvatarUpdate = (event: Event) => {
        const detail = (event as CustomEvent<{ userId?: string }>).detail;
        if (!detail?.userId || detail.userId === userId) {
          onStoreChange();
        }
      };

      window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleAvatarUpdate);
      window.addEventListener("storage", handleAvatarUpdate);

      return () => {
        window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleAvatarUpdate);
        window.removeEventListener("storage", handleAvatarUpdate);
      };
    },
    () => getStoredProfileAvatar(userId),
    () => null,
  );

  return useMemo(() => user?.avatar || localAvatar || null, [localAvatar, user?.avatar]);
}
