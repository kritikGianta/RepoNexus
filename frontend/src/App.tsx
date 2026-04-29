import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/Layout'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import RepositoriesPage from '@/pages/RepositoriesPage'
import RunsPage from '@/pages/RunsPage'
import DebtsPage from '@/pages/DebtsPage'
import TrendsPage from '@/pages/TrendsPage'
import SettingsPage from '@/pages/SettingsPage'
import PRsPage from '@/pages/PRsPage'
import ChatPage from '@/pages/ChatPage'
import StandupPage from './pages/StandupPage'
import InterviewPage from './pages/InterviewPage'
import AutoDocsPage from './pages/AutoDocsPage'
import TutorPage from './pages/TutorPage'
import SetupGuidePage from './pages/SetupGuidePage'
import DiagramPage from './pages/DiagramPage'
import SecurityPage from './pages/SecurityPage'
import IssuesPage from './pages/IssuesPage'
import ReadmePage from './pages/ReadmePage'
import ContributingPage from './pages/ContributingPage'
import ApiDocsPage from './pages/ApiDocsPage'
import CiCdPage from './pages/CiCdPage'
import IssuePlanPage from './pages/IssuePlanPage'
import ReleaseNotesPage from './pages/ReleaseNotesPage'
import ZombieCodePage from './pages/ZombieCodePage'
import MigrationRiskPage from './pages/MigrationRiskPage'
import CostOptimizerPage from './pages/CostOptimizerPage'
import DebtHealthPage from './pages/DebtHealthPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => !!s.token)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/github/callback" element={<LoginPage />} />

      {/* App (protected) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="repos"     element={<RepositoriesPage />} />
        <Route path="runs"      element={<RunsPage />} />
        <Route path="debts"     element={<DebtsPage />} />
        <Route path="trends"    element={<TrendsPage />} />
        <Route path="prs"       element={<PRsPage />} />
        <Route path="chat"      element={<ChatPage />} />
        <Route path="standup"   element={<StandupPage />} />
        <Route path="interview" element={<InterviewPage />} />
        <Route path="docs"      element={<AutoDocsPage />} />
        <Route path="tutor"     element={<TutorPage />} />
        <Route path="setup"     element={<SetupGuidePage />} />
        <Route path="diagram"   element={<DiagramPage />} />
        <Route path="security"  element={<SecurityPage />} />
        <Route path="issues"    element={<IssuesPage />} />
        <Route path="issue-plan" element={<IssuePlanPage />} />
        <Route path="readme"    element={<ReadmePage />} />
        <Route path="contributing" element={<ContributingPage />} />
        <Route path="api-docs"  element={<ApiDocsPage />} />
        <Route path="cicd"      element={<CiCdPage />} />
        <Route path="release-notes" element={<ReleaseNotesPage />} />
        <Route path="zombie-code" element={<ZombieCodePage />} />
        <Route path="migration-risk" element={<MigrationRiskPage />} />
        <Route path="cost-optimizer" element={<CostOptimizerPage />} />
        <Route path="debt-health" element={<DebtHealthPage />} />
        <Route path="settings"  element={<SettingsPage />} />
      </Route>

      {/* Catch-all: old routes redirect to /app */}
      <Route path="/dashboard" element={<Navigate to="/app" replace />} />
      <Route path="/repos"     element={<Navigate to="/app/repos" replace />} />
      <Route path="/runs"      element={<Navigate to="/app/runs" replace />} />
      <Route path="/debts"     element={<Navigate to="/app/debts" replace />} />
      <Route path="/trends"    element={<Navigate to="/app/trends" replace />} />
      <Route path="/prs"       element={<Navigate to="/app/prs" replace />} />
      <Route path="/chat"      element={<Navigate to="/app/chat" replace />} />
      <Route path="/standup"   element={<Navigate to="/app/standup" replace />} />
      <Route path="/interview" element={<Navigate to="/app/interview" replace />} />
      <Route path="/docs"      element={<Navigate to="/app/docs" replace />} />
      <Route path="/tutor"     element={<Navigate to="/app/tutor" replace />} />
      <Route path="/setup"     element={<Navigate to="/app/setup" replace />} />
      <Route path="/diagram"   element={<Navigate to="/app/diagram" replace />} />
      <Route path="/security"  element={<Navigate to="/app/security" replace />} />
      <Route path="/issues"    element={<Navigate to="/app/issues" replace />} />
      <Route path="/settings"  element={<Navigate to="/app/settings" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
