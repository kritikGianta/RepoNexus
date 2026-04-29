import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, GitBranch, Play, AlertTriangle, TrendingUp,
  Settings, GitPullRequest, MessageCircle, Calendar, Target,
  FileText, BookOpen, Terminal, Network, ShieldAlert, Tags,
  FileCode, Users, Route, Search, Briefcase,
  Ghost, Database, DollarSign, Activity, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import AppNavbar from './AppNavbar'
import CommandPalette from './CommandPalette'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/app',                icon: LayoutDashboard, label: 'Dashboard',       end: true },
    ],
  },
  {
    label: 'Code Analysis',
    items: [
      { to: '/app/runs',          icon: Play,            label: 'Analysis Runs',    end: false },
      { to: '/app/debts',         icon: AlertTriangle,   label: 'Debts',            end: false },
      { to: '/app/trends',        icon: TrendingUp,      label: 'Trends',           end: false },
      { to: '/app/security',      icon: ShieldAlert,     label: 'Security Audit',   end: false },
      { to: '/app/debt-health',   icon: Activity,        label: 'Debt Health',      end: false },
      { to: '/app/zombie-code',   icon: Ghost,           label: 'Dead Code',        end: false },
      { to: '/app/migration-risk', icon: Database,       label: 'Migration Risk',   end: false },
    ],
  },
  {
    label: 'Issue Workflow',
    items: [
      { to: '/app/issues',        icon: Tags,            label: 'Issue Triage',     end: false },
      { to: '/app/issue-plan',    icon: Briefcase,       label: 'Issue Planner',    end: false },
      { to: '/app/prs',           icon: GitPullRequest,  label: 'PR Reviewer',      end: false },
    ],
  },
  {
    label: 'Code Understanding',
    items: [
      { to: '/app/chat',          icon: MessageCircle,   label: 'Code Chat',        end: false },
      { to: '/app/diagram',       icon: Network,         label: 'Architecture',     end: false },
      { to: '/app/tutor',         icon: BookOpen,        label: 'Code Tutor',       end: false },
      { to: '/app/interview',     icon: Target,          label: 'Interview Prep',   end: false },
    ],
  },
  {
    label: 'Documentation',
    items: [
      { to: '/app/readme',        icon: FileCode,        label: 'README',           end: false },
      { to: '/app/api-docs',      icon: Route,           label: 'API Docs',         end: false },
      { to: '/app/contributing',  icon: Users,           label: 'Contributing',     end: false },
      { to: '/app/release-notes', icon: FileText,        label: 'Release Notes',    end: false },
      { to: '/app/docs',          icon: BookOpen,        label: 'Auto-Docs',        end: false },
    ],
  },
  {
    label: 'Setup & Config',
    items: [
      { to: '/app/repos',         icon: GitBranch,       label: 'Repositories',     end: false },
      { to: '/app/setup',         icon: Terminal,        label: 'Local Setup',      end: false },
      { to: '/app/cost-optimizer', icon: DollarSign,     label: 'Cost Optimizer',   end: false },
      { to: '/app/standup',       icon: Calendar,        label: 'Daily Standup',    end: false },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/app/settings',      icon: Settings,        label: 'Settings',         end: false },
    ],
  },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const SidebarContent = () => (
    <>
      {/* Search trigger */}
      <button
        onClick={() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
          setMobileMenuOpen(false)
        }}
        className="mx-3 mt-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-surface-200/60 shadow-sm text-surface-400 hover:text-surface-700 hover:border-surface-300 transition-colors text-xs group"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left font-medium">Search...</span>
        <kbd className="text-[10px] bg-surface-50 px-1.5 py-0.5 rounded border border-surface-200 font-mono text-surface-400 group-hover:text-surface-600 transition-colors">⌘K</kbd>
      </button>

      <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto custom-scrollbar">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-surface-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => cn('nav-link group', isActive && 'nav-link-active')}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn(
                        'w-[15px] h-[15px] shrink-0 transition-colors',
                        isActive ? 'text-brand-600' : 'text-surface-400 group-hover:text-surface-700'
                      )} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom version tag */}
      <div className="px-5 py-4 border-t border-surface-200/60 shrink-0">
        <p className="text-[11px] font-medium text-surface-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          RepoNexus · v1.0
        </p>
      </div>
    </>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-50">
      <AppNavbar onMenuClick={() => setMobileMenuOpen(true)} />
      <CommandPalette />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <aside className={cn(
          "fixed inset-y-0 left-0 w-72 bg-surface-50 border-r border-surface-200 z-50 lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="h-12 flex items-center justify-between px-4 border-b border-surface-200 shrink-0">
            <span className="font-bold text-surface-900">Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-surface-200 rounded-md">
              <X className="w-5 h-5 text-surface-500" />
            </button>
          </div>
          <SidebarContent />
        </aside>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-surface-50 border-r border-surface-200/60">
          <SidebarContent />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-surface-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.35] pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent pointer-events-none" />
          
          {/* Scrollable container */}
          <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 flex-1 flex flex-col">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
