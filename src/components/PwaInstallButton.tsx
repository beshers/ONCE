import { useEffect, useState } from "react";
import { MonitorUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaInstallButton() {
  const isMobile = useIsMobile();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandaloneApp(standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandaloneApp(true);
      setMessage("OCNE is installed.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function handleInstallApp() {
    if (isStandaloneApp) {
      setMessage("OCNE is already installed.");
      return;
    }

    if (!installPrompt) {
      setMessage("Open the browser menu and choose Add to Home screen.");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setMessage(choice.outcome === "accepted" ? "OCNE is installing." : "Install cancelled.");
  }

  if (!isMobile || isStandaloneApp) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 md:hidden">
      {message && (
        <div className="max-w-64 rounded-2xl border border-white/10 bg-black/90 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur">
          {message}
        </div>
      )}
      <Button
        type="button"
        className="h-11 rounded-full border border-cyan-400/30 bg-cyan-500 px-4 text-slate-950 shadow-xl shadow-cyan-500/20 hover:bg-cyan-400"
        onClick={() => void handleInstallApp()}
      >
        <MonitorUp className="mr-2 h-4 w-4" />
        Install OCNE
      </Button>
    </div>
  );
}
