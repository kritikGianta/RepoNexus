import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/Layout'
import LandingPage from '@/pages/LandingPage'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const RepositoriesPage = lazy(() => import('@/pages/RepositoriesPage'))
const RunsPage = lazy(() => import('@/pages/RunsPage'))
const DebtsPage = lazy(() => import('@/pages/DebtsPage'))
const TrendsPage = lazy(() => import('@/pages/TrendsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const PRsPage = lazy(() => import('@/pages/PRsPage'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const StandupPage = lazy(() => import('./pages/StandupPage'))
const InterviewPage = lazy(() => import('./pages/InterviewPage'))
const AutoDocsPage = lazy(() => import('./pages/AutoDocsPage'))
const TutorPage = lazy(() => import('./pages/TutorPage'))
const SetupGuidePage = lazy(() => import('./pages/SetupGuidePage'))
const DiagramPage = lazy(() => import('./pages/DiagramPage'))
const SecurityPage = lazy(() => import('./pages/SecurityPage'))
const IssuesPage = lazy(() => import('./pages/IssuesPage'))
const ReadmePage = lazy(() => import('./pages/ReadmePage'))
const ContributingPage = lazy(() => import('./pages/ContributingPage'))
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage'))
const CiCdPage = lazy(() => import('./pages/CiCdPage'))
const IssuePlanPage = lazy(() => import('./pages/IssuePlanPage'))
const ReleaseNotesPage = lazy(() => import('./pages/ReleaseNotesPage'))
const ZombieCodePage = lazy(() => import('./pages/ZombieCodePage'))
const MigrationRiskPage = lazy(() => import('./pages/MigrationRiskPage'))
const CostOptimizerPage = lazy(() => import('./pages/CostOptimizerPage'))
const DebtHealthPage = lazy(() => import('./pages/DebtHealthPage'))

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-surface-300 border-t-surface-800" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => !!s.token)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
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
    </Suspense>
  )
}
