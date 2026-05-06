import { useSyncExternalStore } from "react";
import {
  BUILT_IN_PROFILE_RINGTONES,
  DEFAULT_PROFILE_RINGTONE_NAME,
  DEFAULT_PROFILE_RINGTONE_URL,
  getStoredBuiltInProfileRingtoneId,
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

  const customUrl = useSyncExternalStore(
    subscribe,
    () => getStoredProfileRingtone(userId),
    () => null,
  );

  const customName = useSyncExternalStore(
    subscribe,
    () => getStoredProfileRingtoneName(userId),
    () => null,
  );

  const builtInId = useSyncExternalStore(
    subscribe,
    () => getStoredBuiltInProfileRingtoneId(userId),
    () => null,
  );

  return {
    url: customUrl || DEFAULT_PROFILE_RINGTONE_URL,
    name: customName || DEFAULT_PROFILE_RINGTONE_NAME,
    isCustom: Boolean(customUrl && !builtInId),
    selectedBuiltInId: builtInId || (!customUrl ? BUILT_IN_PROFILE_RINGTONES[0].id : null),
  };
}
