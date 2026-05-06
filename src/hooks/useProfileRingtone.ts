import { useSyncExternalStore } from "react";
import {
  getStoredProfileRingtone,
  getStoredProfileRingtoneName,
  PROFILE_RINGTONE_UPDATED_EVENT,
} from "@/lib/profileRingtone";

export function useProfileRingtone(userId?: string | null) {
  const subscribe = (onStoreChange: () => void) => {
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!detail?.userId || detail.userId === userId) {
        onStoreChange();
      }
    };

    window.addEventListener(PROFILE_RINGTONE_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PROFILE_RINGTONE_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  };

  const url = useSyncExternalStore(
    subscribe,
    () => getStoredProfileRingtone(userId),
    () => null,
  );

  const name = useSyncExternalStore(
    subscribe,
    () => getStoredProfileRingtoneName(userId),
    () => null,
  );

  return { url, name };
}
