import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Github, ArrowRight, Shield, Zap, Eye, BarChart3, GitPullRequest, FileText } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'
import type { AuthTokenResponse, User } from '@/types/api'
import toast from 'react-hot-toast'

const features = [
  { icon: Zap,           title: 'AI Interview Prep',    desc: 'Practice with questions generated from your own repo' },
  { icon: Eye,           title: 'Architecture Diagrams',desc: 'Visualize your codebase as interactive flowcharts' },
  { icon: Shield,        title: 'Security Audit',       desc: 'Detect CVEs, secrets, and outdated dependencies' },
  { icon: BarChart3,     title: 'Issue Triage',         desc: 'AI story-point estimates for all open GitHub issues' },
  { icon: GitPullRequest,title: 'PR Reviewer',          desc: 'Automated code review with bug detection' },
  { icon: FileText,      title: 'Release Notes',        desc: 'Turn commits into professional changelogs' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated()) navigate('/app', { replace: true })
  }, [isAuthenticated, navigate])

  const callbackProcessed = useRef(false)
  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (code && state && !callbackProcessed.current) {
      callbackProcessed.current = true
      handleCallback(code, state)
    }
  }, [searchParams])

  const handleCallback = async (code: string, state: string) => {
    try {
      const authRes = await api.get<AuthTokenResponse>(
        `/auth/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
      )
      useAuthStore.getState().setAuth(authRes.access_token, {} as User)
      const user = await api.get<User>('/auth/me')
      setAuth(authRes.access_token, user)
      toast.success(`Welcome back, ${user.username}!`)
      navigate('/app', { replace: true })
    } catch {
      toast.error('GitHub authentication failed. Please try again.')
    }
  }

  const handleLogin = async () => {
    try {
      const res = await api.get<{ authorize_url: string; state: string }>('/auth/github/login')
      window.location.href = res.authorize_url
    } catch {
      toast.error('Unable to start GitHub login')
    }
  }

  const isProcessingCallback = searchParams.has('code')

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left: Branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] p-12 bg-surface-50 border-r border-surface-200">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-white/0 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="RepoNexus" className="w-7 h-7 object-contain" />
          </div>
          <span className="font-semibold text-surface-900 tracking-tight">RepoNexus</span>
        </div>

        {/* Hero copy */}
        <div className="max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            <span className="text-xs font-medium text-brand-700">AI-Powered GitHub Assistant</span>
          </div>
          <h2 className="text-3xl font-bold text-surface-900 leading-tight mb-3" style={{ letterSpacing: '-0.03em' }}>
            Your GitHub<br />
            <span className="text-brand-600">productivity suite.</span>
          </h2>
          <p className="text-surface-500 text-sm leading-relaxed mb-8">
            From code reviews to architecture diagrams, interview prep to security audits — RepoNexus gives your team 18 AI-powered tools in one place.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-surface-200" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div className="w-7 h-7 rounded-md bg-surface-100 border border-surface-200 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-surface-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-surface-800">{title}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-surface-400">Built with FastAPI · React · Groq AI · LangChain</p>
      </div>

      {/* ── Right: Login panel ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-10">
            <div className="w-7 h-7 rounded-md bg-white/0 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="RepoNexus" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-semibold text-surface-900 tracking-tight">RepoNexus</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-surface-900 mb-1" style={{ letterSpacing: '-0.03em' }}>Sign in</h1>
            <p className="text-sm text-surface-500">Connect your GitHub account to get started.</p>
          </div>

          <button
            onClick={handleLogin}
            disabled={isProcessingCallback}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg
                       bg-surface-900 text-white font-medium text-sm
                       hover:bg-surface-800
                       transition-colors duration-150
                       active:scale-[0.99]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingCallback ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Github className="w-4 h-4" />
                Continue with GitHub
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            )}
          </button>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-200" />
            <span className="text-xs text-surface-400">Secure OAuth 2.0</span>
            <div className="flex-1 h-px bg-surface-200" />
          </div>

          <p className="text-center text-xs text-surface-400 mt-5 leading-relaxed">
            We request read-only access to your repositories for analysis.
            <br />Your tokens are encrypted and never stored in plain text.
          </p>
        </div>
      </div>
    </div>
  )
}
