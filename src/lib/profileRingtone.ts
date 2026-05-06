import defaultRingtoneUrl from "@/The_Monday_Ledger.mp3";

export const PROFILE_RINGTONE_UPDATED_EVENT = "ocne-profile-ringtone-updated";
export const DEFAULT_PROFILE_RINGTONE_NAME = "The Monday Ledger";
export const DEFAULT_PROFILE_RINGTONE_URL = defaultRingtoneUrl;

const ringtoneKey = (userId: string) => `ocne_profile_ringtone_${userId}`;
const ringtoneNameKey = (userId: string) => `ocne_profile_ringtone_name_${userId}`;

export function getStoredProfileRingtone(userId?: string | null) {
  if (!userId || typeof window === "undefined") return null;

  try {
    return localStorage.getItem(ringtoneKey(userId));
  } catch {
    return null;
  }
}

export function getStoredProfileRingtoneName(userId?: string | null) {
  if (!userId || typeof window === "undefined") return null;

  try {
    return localStorage.getItem(ringtoneNameKey(userId));
  } catch {
    return null;
  }
}

export function setStoredProfileRingtone(userId: string, value: string | null, name?: string | null) {
  try {
    if (value) {
      localStorage.setItem(ringtoneKey(userId), value);
      localStorage.setItem(ringtoneNameKey(userId), name || "Custom ringtone");
    } else {
      localStorage.removeItem(ringtoneKey(userId));
      localStorage.removeItem(ringtoneNameKey(userId));
    }
    window.dispatchEvent(new CustomEvent(PROFILE_RINGTONE_UPDATED_EVENT, { detail: { userId } }));
    return true;
  } catch {
    return false;
  }
}
