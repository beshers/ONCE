import { Routes, Route } from 'react-router'
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { useAuth } from "@/hooks/useAuth"
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import Layout from "./components/Layout"

const Dashboard = lazy(() => import("./pages/Dashboard"))
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"))
const EditorPage = lazy(() => import("./pages/EditorPage"))
const TerminalPage = lazy(() => import("./pages/TerminalPage"))
const ChatPage = lazy(() => import("./pages/ChatPage"))
const DownloadsPage = lazy(() => import("./pages/DownloadsPage"))
const SnippetsPage = lazy(() => import("./pages/SnippetsPage"))
const SocialPage = lazy(() => import("./pages/SocialPage"))
const FriendsPage = lazy(() => import("./pages/FriendsPage"))
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"))
const SettingsPage = lazy(() => import("./pages/SettingsPage"))
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"))
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage"))
const WhiteboardPage = lazy(() => import("./pages/WhiteboardPage"))
const HackathonPage = lazy(() => import("./pages/HackathonPage"))
const SnapshotsPage = lazy(() => import("./pages/SnapshotsPage"))
const BookmarksPage = lazy(() => import("./pages/BookmarksPage"))
const OrganizationPage = lazy(() => import("./pages/OrganizationPage"))
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"))
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"))
const StreamPage = lazy(() => import("./pages/StreamPage"))
const DependencyPage = lazy(() => import("./pages/DependencyPage"))
const DeploymentPage = lazy(() => import("./pages/DeploymentPage"))
const BugReportPage = lazy(() => import("./pages/BugReportPage"))
const EnvVariablesPage = lazy(() => import("./pages/EnvVariablesPage"))
const ActivityHeatmapPage = lazy(() => import("./pages/ActivityHeatmapPage"))
const ThemeSettingsPage = lazy(() => import("./pages/ThemeSettingsPage"))
const LocalAgentPage = lazy(() => import("./pages/LocalAgentPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const DatenschutzPage = lazy(() => import("./pages/DatenschutzPage"))
const ImpressumPage = lazy(() => import("./pages/ImpressumPage"))
const CookiesPage = lazy(() => import("./pages/CookiesPage"))
const PwaInstallButton = lazy(() => import("./components/PwaInstallButton"))
const CookieConsent = lazy(() => import("./components/CookieConsent"))

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  )
}

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /loading chunk|failed to fetch dynamically imported module|importing a module script failed|chunkloaderror/i.test(message);
}

class ReloadRecoveryBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("OCNE route failed to render", error, info);
    if (!isChunkLoadError(error)) return;
    const key = "ocne-chunk-reload-attempted";
    if (sessionStorage.getItem(key) === "true") return;
    sessionStorage.setItem(key, "true");
    window.location.reload();
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl shadow-black/30">
          <h1 className="text-lg font-semibold text-white">OCNE needs a fresh reload</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The app loaded an old route bundle. Reload once to fetch the newest editor files.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Reload OCNE
          </button>
        </div>
      </div>
    );
  }
}

function AuthWrapper({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth({ redirectOnUnauthenticated: true })
  if (isLoading) {
    return <LoadingScreen />
  }
  if (!isAuthenticated) return null
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <>
      <Suspense fallback={null}>
        <PwaInstallButton />
        <CookieConsent />
      </Suspense>
      <ReloadRecoveryBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/" element={<AuthWrapper><Dashboard /></AuthWrapper>} />
            <Route path="/projects" element={<AuthWrapper><ProjectsPage /></AuthWrapper>} />
            <Route path="/projects/:id" element={<AuthWrapper><EditorPage /></AuthWrapper>} />
            <Route path="/editor" element={<AuthWrapper><EditorPage /></AuthWrapper>} />
            <Route path="/terminal" element={<AuthWrapper><TerminalPage /></AuthWrapper>} />
            <Route path="/local-agent" element={<AuthWrapper><LocalAgentPage /></AuthWrapper>} />
            <Route path="/chat" element={<AuthWrapper><ChatPage /></AuthWrapper>} />
            <Route path="/downloads" element={<AuthWrapper><DownloadsPage /></AuthWrapper>} />
            <Route path="/snippets" element={<AuthWrapper><SnippetsPage /></AuthWrapper>} />
            <Route path="/social" element={<AuthWrapper><SocialPage /></AuthWrapper>} />
            <Route path="/friends" element={<AuthWrapper><FriendsPage /></AuthWrapper>} />
            <Route path="/notifications" element={<AuthWrapper><NotificationsPage /></AuthWrapper>} />
            <Route path="/settings" element={<AuthWrapper><SettingsPage /></AuthWrapper>} />
            <Route path="/leaderboard" element={<AuthWrapper><LeaderboardPage /></AuthWrapper>} />
            <Route path="/playground" element={<AuthWrapper><PlaygroundPage /></AuthWrapper>} />
            <Route path="/whiteboard" element={<AuthWrapper><WhiteboardPage /></AuthWrapper>} />
            <Route path="/hackathons" element={<AuthWrapper><HackathonPage /></AuthWrapper>} />
            <Route path="/snapshots" element={<AuthWrapper><SnapshotsPage /></AuthWrapper>} />
            <Route path="/bookmarks" element={<AuthWrapper><BookmarksPage /></AuthWrapper>} />
            <Route path="/organizations" element={<AuthWrapper><OrganizationPage /></AuthWrapper>} />
            <Route path="/integrations" element={<AuthWrapper><IntegrationsPage /></AuthWrapper>} />
            <Route path="/documentation" element={<AuthWrapper><DocumentationPage /></AuthWrapper>} />
            <Route path="/stream" element={<AuthWrapper><StreamPage /></AuthWrapper>} />
            <Route path="/dependencies" element={<AuthWrapper><DependencyPage /></AuthWrapper>} />
            <Route path="/deployments" element={<AuthWrapper><DeploymentPage /></AuthWrapper>} />
            <Route path="/bugs" element={<AuthWrapper><BugReportPage /></AuthWrapper>} />
            <Route path="/env-vars" element={<AuthWrapper><EnvVariablesPage /></AuthWrapper>} />
            <Route path="/activity" element={<AuthWrapper><ActivityHeatmapPage /></AuthWrapper>} />
            <Route path="/themes" element={<AuthWrapper><ThemeSettingsPage /></AuthWrapper>} />
            <Route path="/profile" element={<AuthWrapper><ProfilePage /></AuthWrapper>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ReloadRecoveryBoundary>
    </>
  )
}
