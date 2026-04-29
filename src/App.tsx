import { Routes, Route } from 'react-router'
import { useAuth } from "@/hooks/useAuth"
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import Layout from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import ProjectsPage from "./pages/ProjectsPage"
import EditorPage from "./pages/EditorPage"
import TerminalPage from "./pages/TerminalPage"
import ChatPage from "./pages/ChatPage"
import SnippetsPage from "./pages/SnippetsPage"
import SocialPage from "./pages/SocialPage"
import FriendsPage from "./pages/FriendsPage"
import NotificationsPage from "./pages/NotificationsPage"
import SettingsPage from "./pages/SettingsPage"
import LeaderboardPage from "./pages/LeaderboardPage"
import PlaygroundPage from "./pages/PlaygroundPage"
import WhiteboardPage from "./pages/WhiteboardPage"
import HackathonPage from "./pages/HackathonPage"
import SnapshotsPage from "./pages/SnapshotsPage"
import BookmarksPage from "./pages/BookmarksPage"
import OrganizationPage from "./pages/OrganizationPage"
import IntegrationsPage from "./pages/IntegrationsPage"
import DocumentationPage from "./pages/DocumentationPage"
import StreamPage from "./pages/StreamPage"
import DependencyPage from "./pages/DependencyPage"
import DeploymentPage from "./pages/DeploymentPage"
import BugReportPage from "./pages/BugReportPage"
import EnvVariablesPage from "./pages/EnvVariablesPage"
import ActivityHeatmapPage from "./pages/ActivityHeatmapPage"
import ThemeSettingsPage from "./pages/ThemeSettingsPage"
import PwaInstallButton from "./components/PwaInstallButton"

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth({ redirectOnUnauthenticated: true })
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }
  if (!isAuthenticated) return null
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <>
      <PwaInstallButton />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AuthWrapper><Dashboard /></AuthWrapper>} />
        <Route path="/projects" element={<AuthWrapper><ProjectsPage /></AuthWrapper>} />
        <Route path="/projects/:id" element={<AuthWrapper><EditorPage /></AuthWrapper>} />
        <Route path="/editor" element={<AuthWrapper><EditorPage /></AuthWrapper>} />
        <Route path="/terminal" element={<AuthWrapper><TerminalPage /></AuthWrapper>} />
        <Route path="/chat" element={<AuthWrapper><ChatPage /></AuthWrapper>} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
