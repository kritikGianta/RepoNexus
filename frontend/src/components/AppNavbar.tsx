import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { User, LogOut, ChevronDown, Menu } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface AppNavbarProps {
  onMenuClick: () => void
}

export default function AppNavbar({ onMenuClick }: AppNavbarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="h-12 shrink-0 bg-white border-b border-surface-200 flex items-center justify-between px-4 z-20">
      {/* Left: Menu + Logo */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md hover:bg-surface-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-surface-600" />
        </button>
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 rounded-md bg-white/0 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="RepoNexus" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-semibold text-surface-900 text-sm tracking-tight">RepoNexus</span>
        </Link>
      </div>

      {/* Right: User profile */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setProfileOpen(v => !v)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-100 transition-colors"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-surface-200 flex items-center justify-center">
              <span className="text-xs font-bold text-surface-600">{user?.username?.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <span className="hidden sm:block text-sm font-medium text-surface-700">{user?.username}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-surface-400 transition-transform", profileOpen && "rotate-180")} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-surface-200 py-1 z-50"
               style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)' }}>
            <div className="px-3 py-2.5 border-b border-surface-100 mb-1">
              <p className="text-sm font-semibold text-surface-900">{user?.username}</p>
              <p className="text-xs text-surface-400 mt-0.5">{user?.email || 'Free plan'}</p>
            </div>
            <Link
              to="/app/settings"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 transition-colors"
            >
              <User className="w-4 h-4 text-surface-400" />
              Profile & Settings
            </Link>
            <div className="border-t border-surface-100 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
