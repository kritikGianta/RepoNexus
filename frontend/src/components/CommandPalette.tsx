import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Command } from 'lucide-react'
import {
  LayoutDashboard, Calendar, Target, BookOpen, FileText, Terminal,
  Network, ShieldAlert, Tags, MessageCircle, GitBranch, GitPullRequest,
  Play, AlertTriangle, TrendingUp, Settings, FileCode, Users, Route,
  Briefcase, Settings2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const commands = [
  { label: 'Dashboard',        path: '/app',           icon: LayoutDashboard, group: 'Navigate' },
  { label: 'Daily Standup',    path: '/app/standup',   icon: Calendar,        group: 'AI Tools' },
  { label: 'Interview Prep',   path: '/app/interview', icon: Target,          group: 'AI Tools' },
  { label: 'Code Tutor',       path: '/app/tutor',     icon: BookOpen,        group: 'AI Tools' },
  { label: 'Auto-Docs',        path: '/app/docs',      icon: FileText,        group: 'AI Tools' },
  { label: 'Local Setup',      path: '/app/setup',     icon: Terminal,        group: 'AI Tools' },
  { label: 'Architecture',     path: '/app/diagram',   icon: Network,         group: 'AI Tools' },
  { label: 'Security Audit',   path: '/app/security',  icon: ShieldAlert,     group: 'AI Tools' },
  { label: 'Issue Triage',     path: '/app/issues',    icon: Tags,            group: 'AI Tools' },
  { label: 'Issue Planner',    path: '/app/issue-plan',icon: Briefcase,       group: 'AI Tools' },
  { label: 'Code Chat',        path: '/app/chat',      icon: MessageCircle,   group: 'AI Tools' },
  { label: 'CI/CD Pipeline',   path: '/app/cicd',      icon: Settings2,       group: 'Generators' },
  { label: 'README Generator', path: '/app/readme',    icon: FileCode,        group: 'Generators' },
  { label: 'Contributing Guide', path: '/app/contributing', icon: Users,      group: 'Generators' },
  { label: 'API Docs',         path: '/app/api-docs',  icon: Route,           group: 'Generators' },
  { label: 'Release Notes Generator', path: '/app/release-notes', icon: FileText, group: 'Generators' },
  { label: 'Repositories',     path: '/app/repos',     icon: GitBranch,       group: 'Repository' },
  { label: 'PR Reviewer',      path: '/app/prs',       icon: GitPullRequest,  group: 'Repository' },
  { label: 'Analysis Runs',    path: '/app/runs',      icon: Play,            group: 'Repository' },
  { label: 'Debts',            path: '/app/debts',     icon: AlertTriangle,   group: 'Repository' },
  { label: 'Trends',           path: '/app/trends',    icon: TrendingUp,      group: 'Repository' },
  { label: 'Settings',         path: '/app/settings',  icon: Settings,        group: 'Account' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Keyboard shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
        setQuery('')
        setActiveIndex(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter(c => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
  }, [query])

  const grouped = useMemo(() => {
    const groups: Record<string, typeof commands> = {}
    for (const cmd of filtered) {
      if (!groups[cmd.group]) groups[cmd.group] = []
      groups[cmd.group].push(cmd)
    }
    return groups
  }, [filtered])

  const handleSelect = (path: string) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[activeIndex]) handleSelect(filtered[activeIndex].path)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-2xl border border-surface-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
          <Search className="w-5 h-5 text-surface-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search features, pages..."
            className="flex-1 bg-transparent text-sm text-surface-800 placeholder-surface-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-surface-100 text-[10px] font-mono text-surface-500 border border-surface-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-surface-400">No results found.</div>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-surface-400">{group}</div>
              {items.map((cmd) => {
                const idx = filtered.indexOf(cmd)
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.path}
                    onClick={() => handleSelect(cmd.path)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors',
                      idx === activeIndex ? 'bg-brand-50 text-brand-600' : 'text-surface-600 hover:bg-surface-50'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">{cmd.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-surface-100 flex items-center gap-4 text-[10px] text-surface-400">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-surface-100 rounded text-[10px] border border-surface-200">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-surface-100 rounded text-[10px] border border-surface-200">↵</kbd> Select</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-surface-100 rounded text-[10px] border border-surface-200">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
