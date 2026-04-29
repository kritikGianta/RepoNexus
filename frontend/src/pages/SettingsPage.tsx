import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, User as UserIcon, Shield, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="border-b border-surface-200/60 pb-6">
        <div className="flex items-center gap-2 mb-2 text-surface-500">
          <span className="text-xs font-semibold tracking-wider uppercase">Account</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-brand-500" />
          Settings
        </h1>
        <p className="text-sm text-surface-500 mt-2">
          Manage your account preferences, API configuration, and security settings.
        </p>
      </div>

      {/* Profile */}
      <div className="card">
        <h2 className="text-sm font-semibold text-surface-900 flex items-center gap-2 mb-4">
          <UserIcon className="w-4 h-4 text-brand-500" />
          Profile
        </h2>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-14 h-14 rounded-2xl ring-2 ring-brand-500/30" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-brand-600">
                {user?.username?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-surface-900">{user?.username}</p>
            <p className="text-sm text-surface-500">{user?.email || 'No email set'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge bg-brand-50 text-brand-500 border border-brand-500/20 text-[10px]">
                {user?.plan_tier?.toUpperCase()} plan
              </span>
              <a
                href={`https://github.com/${user?.username}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-surface-400 hover:text-brand-500 flex items-center gap-1 transition-colors"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* API */}
      <div className="card">
        <h2 className="text-sm font-semibold text-surface-900 flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-brand-500" />
          API Configuration
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-surface-400 font-medium block mb-1">Backend URL</label>
            <div className="input bg-surface-50 text-surface-500 cursor-default">
              {import.meta.env.VITE_API_URL || '/api/v1'}
            </div>
            <p className="text-[10px] text-surface-400 mt-1">
              Configure via <code className="text-brand-500">VITE_API_URL</code> environment variable
            </p>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <h2 className="text-sm font-semibold text-surface-900 flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-brand-500" />
          Security
        </h2>
        <p className="text-sm text-surface-500 mb-4">
          Your GitHub access token is encrypted using Fernet symmetric encryption and is never stored in plain text.
          Sessions are managed via JWTs with a 24-hour expiry.
        </p>
        <button
          onClick={handleLogout}
          className="btn-danger flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
