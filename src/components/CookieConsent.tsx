import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Cookie, Database, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const CONSENT_STORAGE_KEY = "ocne-cookie-consent";
const CONSENT_COOKIE_NAME = "ocne_cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

type ConsentChoice = "essential" | "accepted";

function readCookieConsent() {
  if (typeof document === "undefined") return null;
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
    ?.split("=")[1] as ConsentChoice | undefined;
}

function saveCookieConsent(choice: ConsentChoice) {
  localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      choice,
      savedAt: new Date().toISOString(),
      version: 1,
    }),
  );
  document.cookie = `${CONSENT_COOKIE_NAME}=${choice}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax`;
}

export default function CookieConsent() {
  const initialConsent = useMemo(() => {
    if (typeof window === "undefined") return true;
    return Boolean(localStorage.getItem(CONSENT_STORAGE_KEY) || readCookieConsent());
  }, []);
  const [isVisible, setIsVisible] = useState(!initialConsent);
  const [showDetails, setShowDetails] = useState(false);

  if (!isVisible) return null;

  const choose = (choice: ConsentChoice) => {
    saveCookieConsent(choice);
    setIsVisible(false);
  };

  return (
    <section
      aria-label="Cookie and local storage notice"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-5xl overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#071018]/95 text-white shadow-2xl shadow-black/40 backdrop-blur-xl sm:bottom-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(245,158,11,0.14),transparent_30%)]" />
      <div className="relative grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10">
            <Cookie className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-cyan-50">Cookies and saved data</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
              OCNE saves essential cookies and browser data to keep you signed in, remember your
              settings, recover editor drafts, and run features like chat, calls, profiles, downloads,
              and the local agent. We use this information to operate the app and improve your
              experience. We do not sell it or use it for advertising.
            </p>
            {showDetails && (
              <div className="mt-4 grid gap-3 text-xs leading-5 text-slate-300 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    What we save
                  </div>
                  Login/session cookies, sidebar width, theme, editor drafts and open files, profile
                  avatar/ringtone choices, call permission preferences, local agent endpoint/token
                  when you enter one, install/cache status, and chat/app settings needed for features.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-white">
                    <Database className="h-4 w-4 text-amber-300" />
                    How we use it
                  </div>
                  To authenticate you, restore your workspace, keep preferences consistent, reconnect
                  local tools, remember media choices, protect direct messages and calls, and make the
                  app faster through browser caching.
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowDetails((value) => !value)}
            className="border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            {showDetails ? "Hide details" : "What is saved"}
          </Button>
          <Button
            asChild
            variant="ghost"
            className="border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <Link to="/datenschutz">Datenschutz</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <Link to="/impressum">Impressum</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => choose("essential")}
            className="border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            Essential only
          </Button>
          <Button
            type="button"
            onClick={() => choose("accepted")}
            className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          >
            Accept
          </Button>
          <button
            type="button"
            aria-label="Close cookie notice"
            onClick={() => choose("essential")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
