import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  GitBranch, AlertTriangle, TrendingUp, Play, ArrowUpRight, Activity,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { cn, debtScoreColor, formatRelativeTime } from '@/lib/utils'
import { CardSkeleton } from '@/components/Skeletons'
import type { RepoListResponse, Repository } from '@/types/api'
import Tilt from 'react-parallax-tilt'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const { data: repoData, isLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<RepoListResponse>('/repos'),
  })

  const repos = repoData?.repositories || []
  const totalRepos = repos.length
  const analyzedRepos = repos.filter((r) => r.last_analyzed_at).length
  const avgScore = repos.reduce((sum, r) => sum + (r.current_overall_debt_score || 0), 0) / (analyzedRepos || 1)
  const worstRepo = repos.reduce<Repository | null>(
    (worst, r) => (!worst || (r.current_overall_debt_score || 0) > (worst.current_overall_debt_score || 0) ? r : worst),
    null
  )

  const statCards = [
    { label: 'Connected Repos', value: totalRepos,  icon: GitBranch,    color: 'text-brand-500',   bg: 'bg-brand-50',   href: '/repos' },
    { label: 'Avg Debt Score',  value: analyzedRepos > 0 ? avgScore.toFixed(1) : '—', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50', href: '/trends' },
    { label: 'Analyzed',        value: analyzedRepos, icon: Play,          color: 'text-emerald-500', bg: 'bg-emerald-50', href: '/runs' },
    { label: 'Needs Attention', value: repos.filter((r) => (r.current_overall_debt_score || 0) >= 60).length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', href: '/debts' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-2 text-surface-500">
            <span className="text-xs font-semibold tracking-wider uppercase">Overview</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-900">
            {greeting}, <span className="text-brand-600">{user?.username}</span>
          </h1>
          <p className="text-sm text-surface-500 mt-1.5">
            Here's what's happening with your repositories today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/runs" className="btn-secondary">
            <Play className="w-4 h-4 text-surface-400" /> View Runs
          </Link>
          <Link to="/repos" className="btn-primary">
            <GitBranch className="w-4 h-4" /> Add Repository
          </Link>
        </div>
      </div>

      {/* Stat Cards (Bento) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={1} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg, href }) => (
            <Link key={label} to={href} className="card card-hover group relative overflow-hidden cursor-pointer block h-full border border-surface-200/50 bg-white hover:border-brand-200/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-full pointer-events-none" />
              <div className="flex flex-col h-full relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-white/50', bg)}>
                    <Icon className={cn('w-5 h-5', color)} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 transition-colors" />
                </div>
                <div>
                  <p className={cn('text-3xl font-bold tracking-tight mb-1', color)}>{value}</p>
                  <p className="text-sm text-surface-500 font-medium">{label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Repository Overview */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold tracking-tight text-surface-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-500" />
              Active Repositories
            </h2>
            <Link to="/repos" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
            </div>
          ) : repos.length === 0 ? (
            <div className="card text-center py-16 border-dashed border-2 bg-surface-50/50 shadow-none">
              <GitBranch className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-surface-900 mb-1">No repositories yet</h3>
              <p className="text-sm text-surface-500 mb-6 max-w-sm mx-auto">Connect your first GitHub repository to start analyzing technical debt.</p>
              <Link to="/repos" className="btn-primary inline-flex items-center gap-2">
                Connect Repository
              </Link>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500 font-semibold">
                    <th className="px-6 py-3 font-medium">Repository</th>
                    <th className="px-6 py-3 font-medium">Language</th>
                    <th className="px-6 py-3 font-medium">Last Analysis</th>
                    <th className="px-6 py-3 text-right font-medium">Debt Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {repos.slice(0, 5).map((repo) => (
                    <tr key={repo.id} className="hover:bg-surface-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 border border-brand-100">
                            <GitBranch className="w-4 h-4 text-brand-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-surface-900 truncate">{repo.full_name}</p>
                            <p className="text-xs text-surface-400 mt-0.5">{repo.default_branch}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {repo.primary_language ? (
                          <span className="badge bg-surface-100 text-surface-600 border-surface-200">{repo.primary_language}</span>
                        ) : (
                          <span className="text-surface-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-500">
                        {repo.last_analyzed_at ? formatRelativeTime(repo.last_analyzed_at) : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {repo.current_overall_debt_score != null ? (
                          <span className={cn('inline-flex items-center justify-center px-2.5 py-1 rounded-md text-sm font-bold border', debtScoreColor(repo.current_overall_debt_score).replace('text-', 'bg-').replace('500', '50').replace('text-', 'border-').replace('500', '100'), debtScoreColor(repo.current_overall_debt_score))}>
                            {repo.current_overall_debt_score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-surface-400 bg-surface-100 px-2 py-1 rounded-md">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar / Worst Repo */}
        <div className="space-y-6">
          {worstRepo && worstRepo.current_overall_debt_score != null && worstRepo.current_overall_debt_score >= 40 && (
            <div>
              <h2 className="text-sm font-bold tracking-tight text-surface-900 mb-3 uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Action Required
              </h2>
              <div className="card border-red-200 bg-gradient-to-b from-red-50 to-white shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 border border-red-200 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-surface-900">{worstRepo.full_name}</p>
                      <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                        This repository has a critical debt score of <span className="font-bold text-red-600">{worstRepo.current_overall_debt_score.toFixed(1)}</span>. Immediate refactoring is recommended.
                      </p>
                    </div>
                  </div>
                  <Link to={`/debts?repo=${worstRepo.id}`} className="btn-danger w-full justify-center shadow-sm">
                    View Debt Items
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          <div className="card bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-brand border-0">
            <h3 className="text-lg font-bold mb-2">Need a code review?</h3>
            <p className="text-sm text-brand-100 mb-5 leading-relaxed">Use our AI PR Reviewer to automatically catch bugs and technical debt before they get merged.</p>
            <Link to="/prs" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-brand-600 bg-white hover:bg-brand-50 transition-colors shadow-sm w-full">
              <GitBranch className="w-4 h-4" /> Setup PR Reviewer
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
