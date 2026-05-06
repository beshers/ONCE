import defaultRingtoneUrl from "@/The_Monday_Ledger.mp3";
import quietestArrivalUrl from "@/The_Quietest_Arrival.mp3";

export const PROFILE_RINGTONE_UPDATED_EVENT = "ocne-profile-ringtone-updated";
export const DEFAULT_PROFILE_RINGTONE_NAME = "The Monday Ledger";
export const DEFAULT_PROFILE_RINGTONE_URL = defaultRingtoneUrl;
export const BUILT_IN_PROFILE_RINGTONES = [
  {
    id: "the-monday-ledger",
    name: "The Monday Ledger",
    url: defaultRingtoneUrl,
  },
  {
    id: "the-quietest-arrival",
    name: "The Quietest Arrival",
    url: quietestArrivalUrl,
  },
] as const;

const ringtoneKey = (userId: string) => `ocne_profile_ringtone_${userId}`;
const ringtoneNameKey = (userId: string) => `ocne_profile_ringtone_name_${userId}`;
const BUILT_IN_PREFIX = "builtin:";

export type BuiltInProfileRingtoneId = (typeof BUILT_IN_PROFILE_RINGTONES)[number]["id"];

export function getBuiltInProfileRingtone(id?: string | null) {
  return BUILT_IN_PROFILE_RINGTONES.find((ringtone) => ringtone.id === id) || BUILT_IN_PROFILE_RINGTONES[0];
}

export function getStoredProfileRingtone(userId?: string | null) {
  if (!userId || typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(ringtoneKey(userId));
    if (value?.startsWith(BUILT_IN_PREFIX)) {
      return getBuiltInProfileRingtone(value.slice(BUILT_IN_PREFIX.length)).url;
    }
    return value;
  } catch {
    return null;
  }
}

export function getStoredProfileRingtoneName(userId?: string | null) {
  if (!userId || typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(ringtoneKey(userId));
    if (value?.startsWith(BUILT_IN_PREFIX)) {
      return getBuiltInProfileRingtone(value.slice(BUILT_IN_PREFIX.length)).name;
    }
    return localStorage.getItem(ringtoneNameKey(userId));
  } catch {
    return null;
  }
}

export function getStoredBuiltInProfileRingtoneId(userId?: string | null) {
  if (!userId || typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(ringtoneKey(userId));
    return value?.startsWith(BUILT_IN_PREFIX) ? value.slice(BUILT_IN_PREFIX.length) : null;
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

export function setStoredBuiltInProfileRingtone(userId: string, id: BuiltInProfileRingtoneId) {
  const ringtone = getBuiltInProfileRingtone(id);
  try {
    localStorage.setItem(ringtoneKey(userId), `${BUILT_IN_PREFIX}${ringtone.id}`);
    localStorage.setItem(ringtoneNameKey(userId), ringtone.name);
    window.dispatchEvent(new CustomEvent(PROFILE_RINGTONE_UPDATED_EVENT, { detail: { userId } }));
    return true;
  } catch {
    return false;
  }
}
